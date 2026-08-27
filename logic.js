export const PAUSE_LIMIT_SECONDS = 45 * 60;
export const PAUSE_LIMIT_COUNT = 3;

export function pickSuggestionBatch(pool, current = [], size = 3, random = Math.random) {
  const currentIds = new Set(current.map(item => item.id));
  const alternatives = pool.filter(item => !currentIds.has(item.id));
  const source = alternatives.length >= size ? alternatives : pool;
  const shuffled = [...source];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled.slice(0, Math.min(size, shuffled.length));
}

export function sortTasksForDisplay(tasks) {
  const priority = { in_progress: 0, paused: 1, interrupted: 2, makeup: 3, planned: 4, failed: 8, completed: 9 };
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((left, right) => (priority[left.task.status] ?? 5) - (priority[right.task.status] ?? 5) || left.index - right.index)
    .map(item => item.task);
}

export function advanceRunningTimer(task, now = Date.now()) {
  const remainingSeconds = Math.max(0, Number(task?.remainingSeconds) || 0);
  const focusedSeconds = Math.max(0, Number(task?.focusedSeconds) || 0);
  const previousTick = Number(task?.lastTickAt);
  if (!Number.isFinite(previousTick) || previousTick <= 0 || now < previousTick) {
    return { remainingSeconds, focusedSeconds, lastTickAt: now, consumedSeconds: 0 };
  }
  const elapsedSeconds = Math.max(0, Math.floor((now - previousTick) / 1000));
  const consumedSeconds = Math.min(remainingSeconds, elapsedSeconds);
  return {
    remainingSeconds: Math.max(0, remainingSeconds - consumedSeconds),
    focusedSeconds: focusedSeconds + consumedSeconds,
    lastTickAt: previousTick + elapsedSeconds * 1000,
    consumedSeconds
  };
}

export function nextReminderTime(now, time = '10:00') {
  const [rawHour, rawMinute] = String(time).split(':').map(Number);
  const hour = Number.isInteger(rawHour) && rawHour >= 0 && rawHour <= 23 ? rawHour : 10;
  const minute = Number.isInteger(rawMinute) && rawMinute >= 0 && rawMinute <= 59 ? rawMinute : 0;
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

export function taskProgress(task) {
  const nodes = Array.isArray(task?.nodes) ? task.nodes : [];
  if (nodes.length) return Math.round(nodes.filter(node => node.done).length / nodes.length * 100);
  return Number(task?.manualProgress) || 0;
}

export function durationToMinutes(value, unit = 'minutes') {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  const rawMinutes = unit === 'hours' ? numeric * 60 : numeric;
  if (rawMinutes < 1) return 0;
  return Math.round(rawMinutes);
}

export function warningMinutes(taskOrMinutes) {
  const plannedMinutes = typeof taskOrMinutes === 'number'
    ? taskOrMinutes
    : Number(taskOrMinutes?.plannedMinutes);
  return Math.max(1, Math.round(plannedMinutes / 5));
}

export function remainingPlannedMinutes(tasks, excludeTaskId = null) {
  return tasks
    .filter(task => task.id !== excludeTaskId && !['completed', 'failed', 'abandoned'].includes(task.status))
    .reduce((sum, task) => sum + Math.ceil(Math.max(0, Number(task.remainingSeconds) || 0) / 60), 0);
}

export function availableMinutesUntilMidnight(now, tasks = [], excludeTaskId = null) {
  const deadline = new Date(now);
  deadline.setHours(24, 0, 0, 0);
  const clockMinutes = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 60000));
  return Math.max(0, clockMinutes - remainingPlannedMinutes(tasks, excludeTaskId));
}

export function isTaskTimeAllowed(now, tasks, minutes, excludeTaskId = null) {
  const numeric = Number(minutes);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= availableMinutesUntilMidnight(now, tasks, excludeTaskId);
}

export function nodeDurationValid(nodes, plannedMinutes) {
  if (!nodes.length) return true;
  return nodes.length <= 10
    && nodes.every(node => Number.isInteger(Number(node.minutes)) && Number(node.minutes) >= 1)
    && nodes.reduce((sum, node) => sum + Number(node.minutes), 0) === Number(plannedMinutes);
}

export function effectivePauseSeconds(task, now = Date.now(), limitSeconds = PAUSE_LIMIT_SECONDS) {
  const stored = Math.max(0, Number(task?.pauseUsedSeconds) || 0);
  const current = task?.status === 'paused'
    ? Math.max(0, Math.floor((now - (Number(task.pausedAt) || now)) / 1000))
    : 0;
  return Math.min(limitSeconds, stored + current);
}

export function reviewAppeal(reason) {
  const normalized = String(reason || '').replace(/\s+/g, '');
  const negative = /(忘了|忘记|不想|没心情|懒|拖延|贪玩|游戏|刷视频|看剧|睡过头|不重要|随便)/;
  const objective = /(生病|发烧|受伤|医院|急诊|突发|紧急|停电|断网|故障|事故|家人|照顾|不可抗力|学校临时|工作临时)/;
  if (normalized.length < 8) return { approved: false, message: '理由过于简略，无法证明属于客观中断。' };
  if (negative.test(normalized)) return { approved: false, message: '该理由属于可主动避免的拖延或娱乐行为，不符合待补条件。' };
  if (objective.test(normalized)) return { approved: true, message: '理由包含明确的客观突发因素，允许转为黄色待补。' };
  return { approved: false, message: '当前本地规则无法确认属于不可控原因，因此按保守规则驳回。' };
}

export function calendarStateForTasks(tasks, { free = false, future = false } = {}) {
  if (free) return 'free';
  if (future) return 'future';
  if (tasks.some(task => task.status === 'makeup')) return 'yellow';
  const completed = tasks.filter(task => task.status === 'completed').length;
  if (!tasks.length || completed === 0) return 'red';
  return completed === tasks.length ? 'green' : 'yellow';
}

export function freeDayCards(greenDays, usedDays) {
  return Math.max(0, Math.floor(Number(greenDays) / 7) - Number(usedDays));
}

export function monthCompletionRate(counts) {
  const counted = Number(counts.green) + Number(counts.yellow) + Number(counts.red);
  return counted ? Math.round(Number(counts.green) / counted * 100) : 0;
}
