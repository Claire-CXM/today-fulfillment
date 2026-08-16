const STORAGE_KEY = 'today-fulfillment-state-v1';
const MAX_NODES = 10;
const PAUSE_LIMIT_SECONDS = 15 * 60;
const PAUSE_LIMIT_COUNT = 3;
const DEFAULT_REWARDS = ['看一集喜欢的节目', '喝一杯喜欢的饮品', '自由放松 20 分钟', '散步听歌 15 分钟', '吃一份小甜点'];
const DEFAULT_PUNISHMENTS = ['整理书桌 10 分钟', '额外复习 10 分钟', '做 15 个深蹲', '当天减少娱乐 20 分钟'];
const WARNING_COPY = {
  gentle: '时间有点紧，但你已经走到这里了。先完成最关键的一步，再决定是否调整。',
  direct: '剩余时间不足 30 分钟，当前进度低于 60%。停止分心，立刻推进核心节点。',
  humorous: '倒计时已经开始敲桌子了。别和进度条互相装没看见，先干最关键的。'
};
const NODE_ENCOURAGEMENT = ['这一格完成得很扎实。', '节点已拿下，继续保持节奏。', '很好，进度正在变成结果。', '又兑现了一小步。'];

const $ = selector => document.querySelector(selector);
const els = { taskList: $('#task-list'), taskForm: $('#task-form'), title: $('#task-title'), minutes: $('#task-minutes'), formMessage: $('#form-message'), taskCount: $('#task-count'), dailyScore: $('#daily-score'), dailyNote: $('#daily-note'), todayButton: $('#today-button'), focusPanel: $('#focus-panel'), focusTitle: $('#focus-title'), timer: $('#timer'), pauseButton: $('#pause-button'), finishButton: $('#finish-button'), pauseHint: $('#pause-hint'), focusTaskButton: $('#focus-task-button'), week: $('#week-calendar'), monthCalendar: $('#month-calendar'), monthLabel: $('#month-label'), dayDetail: $('#day-detail'), freeDayCount: $('#free-day-count'), freeDayDate: $('#free-day-date'), useFreeDay: $('#use-free-day'), summaryFocus: $('#summary-focus'), summaryPauses: $('#summary-pauses'), summaryProgress: $('#summary-progress'), abandonNote: $('#abandon-note'), dailyReport: $('#daily-report'), monthlyReport: $('#monthly-report'), promptStyle: $('#prompt-style'), guiltCopy: $('#guilt-copy'), reduceMotion: $('#reduce-motion'), rewardForm: $('#reward-form'), rewardInput: $('#reward-input'), rewardList: $('#reward-list'), rewardHistory: $('#reward-history'), rewardCount: $('#reward-count'), punishmentForm: $('#punishment-form'), punishmentInput: $('#punishment-input'), punishmentList: $('#punishment-list'), penaltyHistory: $('#penalty-history'), punishmentCount: $('#punishment-count'), warningDialog: $('#warning-dialog'), warningTitle: $('#warning-title'), warningCopy: $('#warning-copy'), warningContinue: $('#warning-continue'), rewardDialog: $('#reward-dialog'), rewardTaskName: $('#reward-task-name'), rewardOptions: $('#reward-options'), shuffleRewards: $('#shuffle-rewards'), claimReward: $('#claim-reward'), penaltyDialog: $('#penalty-dialog'), penaltyContent: $('#penalty-content'), penaltyLater: $('#penalty-later'), penaltyDone: $('#penalty-done'), appealDialog: $('#appeal-dialog'), appealForm: $('#appeal-form'), appealReason: $('#appeal-reason'), appealHonesty: $('#appeal-honesty'), appealClose: $('#appeal-close'), celebration: $('#celebration'), todayNavBadge: $('#today-nav-badge'), toast: $('#toast'), nodeDialog: $('#node-dialog'), nodeDialogTitle: $('#node-dialog-title'), nodeForm: $('#node-form'), nodeList: $('#node-list'), addNodeButton: $('#add-node-button') };

let state = loadState();
let editingNodesFor = null;
let timerId = null;
let currentView = 'today';
let selectedCalendarDate = dateKey();
let pendingRewardTaskId = null;
let selectedReward = null;
let pendingPenaltyId = null;
let pendingAppealTaskId = null;

function dateKey(date = new Date()) { const offset = date.getTimezoneOffset() * 60000; return new Date(date - offset).toISOString().slice(0, 10); }
function localDate(date = new Date()) { return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(date); }
function uid() { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`; }
function freshState() { return { tasks: [], events: [], rewards: DEFAULT_REWARDS.map(content => ({ id: uid(), content })), punishments: DEFAULT_PUNISHMENTS.map(content => ({ id: uid(), content })), claimedRewards: [], penaltyRecords: [], freeDays: [], stageRewardsUnlocked: [], settings: { promptStyle: 'gentle', guiltCopy: false, reduceMotion: false, reminderTime: '10:00' } }; }
function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || !Array.isArray(parsed.tasks)) return freshState();
    const defaults = freshState();
    parsed.events ||= [];
    parsed.rewards = Array.isArray(parsed.rewards) ? parsed.rewards : defaults.rewards;
    parsed.punishments = Array.isArray(parsed.punishments) ? parsed.punishments : defaults.punishments;
    parsed.claimedRewards ||= [];
    parsed.penaltyRecords ||= [];
    parsed.freeDays ||= [];
    parsed.stageRewardsUnlocked ||= [];
    parsed.settings = { ...defaults.settings, ...(parsed.settings || {}) };
    parsed.tasks.forEach(task => { task.nodes ||= []; task.warned ||= false; task.appealUsed ||= false; task.pauseCount ||= 0; task.pauseUsedSeconds ||= 0; task.manualProgress ||= 0; task.focusedSeconds ??= task.startedAt ? Math.max(0, task.plannedSeconds - task.remainingSeconds) : 0; });
    return parsed;
  } catch { return freshState(); }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function todayTasks() { return state.tasks.filter(task => task.date === dateKey()); }
function visibleTasks() { return todayTasks().filter(task => task.status !== 'abandoned'); }
function activeTask() { return state.tasks.find(task => task.status === 'in_progress'); }
function taskProgress(task) { if (task.nodes.length) return Math.round(task.nodes.filter(node => node.done).length / task.nodes.length * 100); return task.manualProgress || 0; }
function taskElapsed(task) { return Math.max(0, task.focusedSeconds || 0); }
function formatTime(seconds) { const safe = Math.max(0, Math.round(seconds)); return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`; }
function taskStatus(task) { return ({ planned: '待开始', makeup: '黄色待补', in_progress: '专注中', paused: '已暂停', completed: '已完成', failed: '已结束', abandoned: '已放弃' })[task.status] || '待开始'; }
function toast(message) { els.toast.textContent = message; els.toast.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => els.toast.classList.remove('show'), 3200); }
function isTimeAllowed(minutes) { const now = new Date(); const deadline = new Date(now); deadline.setHours(24, 0, 0, 0); return now.getTime() + Number(minutes) * 60000 <= deadline.getTime(); }
function addEvent(type, task, details = {}) { state.events.push({ id: uid(), type, taskId: task.id, taskTitle: task.title, at: new Date().toISOString(), date: task.date, ...details }); }
function dateFromKey(key) { return new Date(`${key}T12:00:00`); }
function tasksForDate(key) { return state.tasks.filter(task => task.date === key); }
function isFreeDay(key) { return state.freeDays.includes(key); }
function completedTasks(tasks) { return tasks.filter(task => task.status === 'completed').length; }
function greenDayCount() {
  const dates = [...new Set(state.tasks.map(task => task.date))];
  return dates.filter(key => calendarState(dateFromKey(key)) === 'green').length;
}
function availableFreeDayCards() { return Math.max(0, Math.floor(greenDayCount() / 7) - state.freeDays.length); }
function totalFocusSeconds(tasks = state.tasks) { return tasks.reduce((sum, task) => sum + taskElapsed(task), 0); }
function randomItem(items) { return items[Math.floor(Math.random() * items.length)]; }

function render() {
  const tasks = visibleTasks();
  const completed = tasks.filter(task => task.status === 'completed').length;
  els.todayButton.textContent = localDate();
  els.taskCount.textContent = `${tasks.length} 个任务`;
  els.dailyScore.textContent = `${completed}/${tasks.length}`;
  els.dailyNote.textContent = tasks.length ? (completed === tasks.length ? '今天的承诺，已经全部兑现。' : '从最重要的一件开始。') : '先写下一件真正要完成的事。';
  const pending = tasks.filter(task => task.status !== 'completed' && task.status !== 'failed').length;
  els.todayNavBadge.hidden = pending === 0;
  els.todayNavBadge.textContent = pending > 9 ? '9+' : String(pending);
  renderTaskList(tasks);
  renderFocus();
  renderCalendar();
  renderSummary(tasks);
  renderReports();
  renderPreferences();
  renderPools();
}

function switchView(viewName) {
  const target = document.querySelector(`.app-view[data-view="${viewName}"]`);
  if (!target) return;
  currentView = viewName;
  document.querySelectorAll('.app-view').forEach(view => { view.hidden = view !== target; });
  document.querySelectorAll('.nav-item').forEach(button => {
    const active = button.dataset.target === viewName;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderTaskList(tasks) {
  if (!tasks.length) { els.taskList.innerHTML = `<div class="empty-slots">${[1,2,3].map(index => `<div class="empty-slot"><b>${index}</b><span>为今天留一个任务位</span></div>`).join('')}</div>`; return; }
  els.taskList.innerHTML = tasks.map(task => {
    const progress = taskProgress(task); const nodes = task.nodes.slice(0, 4).map(node => `<span class="node-pill ${node.done ? 'done' : ''}">${escapeHtml(node.title || '未命名节点')}</span>`).join('');
    const beginLabel = task.status === 'paused' ? '继续专注' : '开始专注';
    const disabled = task.status === 'completed' || task.status === 'failed';
    return `<article class="task-card ${task.status}" data-task-id="${task.id}"><div class="task-row"><div><h3 class="task-title">${escapeHtml(task.title)}</h3><p class="task-meta">预计 ${task.plannedMinutes} 分钟 · 剩余 ${formatTime(task.remainingSeconds)}</p></div><span class="status ${task.status}">${taskStatus(task)}</span></div><div class="task-progress"><span style="width:${progress}%"></span></div><div class="progress-row"><span>${task.nodes.length ? `${task.nodes.filter(node => node.done).length}/${task.nodes.length} 节点` : '手动进度'}</span><strong>${progress}%</strong></div>${task.nodes.length ? `<div class="node-preview">${nodes}${task.nodes.length > 4 ? `<span class="node-pill">+${task.nodes.length - 4}</span>` : ''}</div>` : ''}<div class="task-actions">${!disabled ? `<button class="button primary" data-action="start" type="button">${beginLabel}</button><button class="button outline" data-action="nodes" type="button">${task.nodes.length ? '编辑节点' : '拆分节点'}</button><button class="button quiet" data-action="complete" type="button">直接完成</button>` : ''}${task.status === 'failed' && !task.appealUsed ? '<button class="button primary" data-action="appeal" type="button">申请待补</button>' : ''}<button class="text-button" data-action="edit" type="button">编辑</button><button class="text-button delete-button" data-action="delete" type="button">删除</button></div></article>`;
  }).join('');
}

function renderFocus() {
  const task = activeTask();
  els.focusPanel.hidden = !task;
  if (!task) return;
  els.focusTitle.textContent = task.title;
  els.timer.textContent = formatTime(task.remainingSeconds);
  els.pauseHint.textContent = `普通暂停：${task.pauseCount}/${PAUSE_LIMIT_COUNT} 次，剩余 ${formatTime(Math.max(0, PAUSE_LIMIT_SECONDS - task.pauseUsedSeconds))}`;
}

function calendarState(day) {
  const key = dateKey(day); const tasks = tasksForDate(key); const done = completedTasks(tasks);
  if (isFreeDay(key)) return 'free';
  if (day > new Date() && key !== dateKey()) return 'future';
  if (tasks.some(task => task.status === 'makeup')) return 'yellow';
  if (!tasks.length || done === 0) return 'red';
  return done === tasks.length ? 'green' : 'yellow';
}
function renderCalendar() {
  const today = new Date(); const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  els.week.innerHTML = Array.from({ length: 7 }, (_, index) => { const day = new Date(monday); day.setDate(monday.getDate() + index); const stateName = calendarState(day); const isToday = dateKey(day) === dateKey(); return `<button type="button" class="day ${stateName} ${isToday ? 'today' : ''}" data-date="${dateKey(day)}"><span>${'一二三四五六日'[index]}</span><strong>${day.getDate()}</strong><i class="day-status ${stateName}"></i></button>`; }).join('');
  const year = today.getFullYear(); const month = today.getMonth(); const first = new Date(year, month, 1); const leading = (first.getDay() + 6) % 7; const total = new Date(year, month + 1, 0).getDate();
  els.monthLabel.textContent = `${year}.${String(month + 1).padStart(2, '0')}`;
  els.monthCalendar.innerHTML = `${'<span class="month-blank"></span>'.repeat(leading)}${Array.from({ length: total }, (_, index) => { const day = new Date(year, month, index + 1); const key = dateKey(day); const stateName = calendarState(day); return `<button type="button" class="month-day ${stateName} ${key === dateKey() ? 'today' : ''} ${key === selectedCalendarDate ? 'selected' : ''}" data-date="${key}"><span>${index + 1}</span><i>${stateName === 'free' ? '休' : stateName === 'green' ? '✓' : stateName === 'yellow' ? '–' : stateName === 'red' ? '×' : ''}</i></button>`; }).join('')}`;
  els.freeDayCount.textContent = availableFreeDayCards();
  els.freeDayDate.value ||= dateKey();
  renderDayDetail();
}
function renderSummary(tasks) {
  const focusSeconds = tasks.reduce((sum, task) => sum + taskElapsed(task), 0); const pauses = tasks.reduce((sum, task) => sum + task.pauseCount, 0); const average = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + taskProgress(task), 0) / tasks.length) : 0; const abandoned = todayTasks().filter(task => task.status === 'abandoned').length;
  els.summaryFocus.textContent = `${Math.floor(focusSeconds / 60)} 分钟`; els.summaryPauses.textContent = `${pauses} 次`; els.summaryProgress.textContent = `${average}%`; els.abandonNote.textContent = abandoned ? `另有 ${abandoned} 个任务以“主动放弃”保留在今日记录中。` : '完成不是完美，而是把承诺落到实处。';
}

function renderDayDetail() {
  const key = selectedCalendarDate; const tasks = tasksForDate(key); const stateName = calendarState(dateFromKey(key)); const label = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(dateFromKey(key));
  if (isFreeDay(key)) { els.dayDetail.innerHTML = `<p class="eyebrow">${label}</p><h2>自由日</h2><p>这一天不需要创建任务，也不计入红黄绿完成率。</p>`; return; }
  if (!tasks.length) { els.dayDetail.innerHTML = `<p class="eyebrow">${label}</p><h2>${stateName === 'future' ? '尚未到来' : '当日无任务'}</h2><p>${stateName === 'future' ? '未来日期暂不记录状态。' : '零完成或全天无任务记为红叉，不支持补做。'}</p>`; return; }
  const canMakeUp = stateName === 'yellow' && key < dateKey();
  els.dayDetail.innerHTML = `<p class="eyebrow">${label} · ${stateName === 'green' ? '全部完成' : stateName === 'yellow' ? '待补' : '未完成'}</p><h2>${completedTasks(tasks)}/${tasks.length} 个任务完成</h2><div class="makeup-list">${tasks.map(task => `<div><span><strong>${escapeHtml(task.title)}</strong><small>${task.status === 'completed' ? `完成于 ${task.actualCompletedDate || task.date}` : taskStatus(task)}</small></span>${canMakeUp && !['completed','abandoned'].includes(task.status) ? `<button class="button quiet" type="button" data-makeup-task="${task.id}">补做完成</button>` : ''}</div>`).join('')}</div>`;
}

function renderReports() {
  const tasks = todayTasks(); const done = completedTasks(tasks); const allDone = tasks.length > 0 && done === tasks.length; const resolved = tasks.length > 0 && tasks.every(task => ['completed','failed','abandoned'].includes(task.status)); const pauses = tasks.reduce((sum, task) => sum + task.pauseCount, 0); const appeals = state.events.filter(event => event.date === dateKey() && event.type === 'appealed').length; const abandoned = tasks.filter(task => task.status === 'abandoned').length; const focusMinutes = Math.floor(totalFocusSeconds(tasks) / 60);
  if (isFreeDay(dateKey())) els.dailyReport.innerHTML = '<p class="eyebrow">日总结</p><h2>今天是自由日</h2><p>放心休息。休息不是中断成长，而是成长的一部分。</p>';
  else if (!resolved) els.dailyReport.innerHTML = `<p class="eyebrow">日总结</p><h2>任务全部结束后生成</h2><p>当前已完成 ${done}/${tasks.length} 个任务。专注 ${focusMinutes} 分钟，普通暂停 ${pauses} 次。</p>`;
  else els.dailyReport.innerHTML = `<p class="eyebrow">日总结已生成</p><h2>${allDone ? '今天的承诺已经兑现' : '今天的结果已经如实记录'}</h2><div class="report-lines"><p><strong>完成情况</strong><span>${done}/${tasks.length} 个任务完成</span></p><p><strong>专注时长</strong><span>${focusMinutes} 分钟</span></p><p><strong>异常记录</strong><span>暂停 ${pauses} 次 · 申辩 ${appeals} 次 · 主动放弃 ${abandoned} 个</span></p><p><strong>做得好</strong><span>你把过程转化成了可复盘的真实记录。</span></p><p><strong>可改进</strong><span>${pauses > 1 ? '明天尝试减少中途切换，保护连续专注时间。' : allDone ? '保持今天的节奏，为最重要的任务预留充足时间。' : '明天减少任务规模，优先保证最重要的一项能够完成。'}</span></p></div><p class="encouragement">${allDone ? '今天不是“感觉努力”，而是真正完成。很好。' : '真实面对结果，就是下一次做得更好的起点。'}</p>`;
  const now = new Date(); const year = now.getFullYear(); const month = now.getMonth(); const monthTasks = state.tasks.filter(task => { const day = dateFromKey(task.date); return day.getFullYear() === year && day.getMonth() === month; }); const keys = Array.from({ length: now.getDate() }, (_, index) => dateKey(new Date(year, month, index + 1))); const counts = { green: 0, yellow: 0, red: 0, free: 0 }; keys.forEach(key => { const name = calendarState(dateFromKey(key)); if (counts[name] !== undefined) counts[name] += 1; }); const counted = counts.green + counts.yellow + counts.red; const rate = counted ? Math.round(counts.green / counted * 100) : 0;
  els.monthlyReport.innerHTML = `<p class="eyebrow">${year} 年 ${month + 1} 月总结</p><h2>本月完成率 ${rate}%</h2><div class="month-stats"><div><strong>${counts.green}</strong><span>绿钩</span></div><div><strong>${counts.yellow}</strong><span>黄线</span></div><div><strong>${counts.red}</strong><span>红叉</span></div><div><strong>${counts.free}</strong><span>自由日</span></div></div><p>累计专注 ${Math.floor(totalFocusSeconds(monthTasks) / 60)} 分钟；异常记录 ${state.events.filter(event => { const day = new Date(event.at); return day.getFullYear() === year && day.getMonth() === month && ['paused','appealed','abandoned','timed_out'].includes(event.type); }).length} 条。${rate >= 70 ? '节奏稳定，继续保持任务规模与可用时间匹配。' : '建议减少单日任务数量，优先守住最重要的一项。'}</p>`;
}

function renderPreferences() { els.promptStyle.value = state.settings.promptStyle; els.guiltCopy.checked = state.settings.guiltCopy; els.reduceMotion.checked = state.settings.reduceMotion; document.documentElement.classList.toggle('reduce-motion', state.settings.reduceMotion); }
function renderPools() {
  els.rewardCount.textContent = `${state.rewards.length} 项`; els.punishmentCount.textContent = `${state.punishments.length} 项`;
  els.rewardList.innerHTML = state.rewards.map(item => `<span>${escapeHtml(item.content)}<button type="button" data-remove-reward="${item.id}" aria-label="删除奖励">×</button></span>`).join('');
  els.punishmentList.innerHTML = state.punishments.map(item => `<span>${escapeHtml(item.content)}<button type="button" data-remove-punishment="${item.id}" aria-label="删除惩罚">×</button></span>`).join('');
  els.rewardHistory.innerHTML = state.claimedRewards.length ? `<p class="eyebrow">最近领取</p>${state.claimedRewards.slice(-5).reverse().map(item => `<div><span><strong>${escapeHtml(item.content)}</strong><small>${escapeHtml(item.taskTitle)}</small></span><time>${new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(item.claimedAt))}</time></div>`).join('')}` : '';
  els.penaltyHistory.innerHTML = state.penaltyRecords.length ? `<p class="eyebrow">约束记录</p>${state.penaltyRecords.slice(-5).reverse().map(item => `<div><span><strong>${escapeHtml(item.content)}</strong><small>${item.status === 'completed' ? '已诚信完成' : '待确认完成'}</small></span><time>${item.date}</time></div>`).join('')}` : '';
}
function escapeHtml(value) { const element = document.createElement('div'); element.textContent = value; return element.innerHTML; }

function createTask(title, minutes) { const task = { id: uid(), title: title.trim(), plannedMinutes: Number(minutes), plannedSeconds: Number(minutes) * 60, remainingSeconds: Number(minutes) * 60, focusedSeconds: 0, status: 'planned', nodes: [], manualProgress: 0, pauseCount: 0, pauseUsedSeconds: 0, date: dateKey(), createdAt: new Date().toISOString() }; state.tasks.push(task); addEvent('created', task); saveState(); render(); toast('已加入今天。现在，你只需要开始。'); }
function startTask(task) { const running = activeTask(); if (running && running.id !== task.id) { toast(`“${running.title}”正在专注中，请先暂停或完成它。`); return; } if (task.status === 'completed' || task.status === 'failed') return; task.status = 'in_progress'; task.startedAt ||= new Date().toISOString(); task.lastTickAt = Date.now(); addEvent('started', task); saveState(); render(); startTicker(); }
function pauseTask(task) { if (task.status !== 'in_progress') return; if (task.pauseCount >= PAUSE_LIMIT_COUNT || task.pauseUsedSeconds >= PAUSE_LIMIT_SECONDS) { toast('这个任务今天的普通暂停额度已用完，请继续专注或完成任务。'); return; } updateRunningTask(task); task.status = 'paused'; task.pausedAt = Date.now(); task.pauseCount += 1; addEvent('paused', task); saveState(); render(); startTicker(); }
function resumeTask(task) { if (task.status !== 'paused') return; if (task.pauseUsedSeconds >= PAUSE_LIMIT_SECONDS) { toast('普通暂停累计已达 15 分钟，请直接继续专注。'); task.status = 'in_progress'; task.lastTickAt = Date.now(); saveState(); render(); startTicker(); return; } const now = Date.now(); task.pauseUsedSeconds = Math.min(PAUSE_LIMIT_SECONDS, task.pauseUsedSeconds + Math.floor((now - task.pausedAt) / 1000)); task.status = 'in_progress'; task.lastTickAt = now; addEvent('resumed', task); saveState(); render(); startTicker(); }
function completeTask(task, madeUp = false) { if (!task || task.status === 'completed') return; if (task.status === 'in_progress') updateRunningTask(task); task.status = 'completed'; task.remainingSeconds = 0; task.manualProgress = 100; task.actualCompletedDate = dateKey(); task.nodes.forEach(node => { node.done = true; }); addEvent(madeUp ? 'made_up' : 'completed', task, { actualCompletedDate: task.actualCompletedDate }); saveState(); render(); celebrate(task); openRewardDialog(task); checkStageRewards(); toast(madeUp ? '补做完成，原计划日期已更新为绿钩。' : '任务完成！你做到了，今天的努力算数。'); }
function updateRunningTask(task) { if (task.status !== 'in_progress') return; const now = Date.now(); const delta = Math.max(0, Math.floor((now - (task.lastTickAt || now)) / 1000)); const consumed = Math.min(task.remainingSeconds, delta); task.remainingSeconds = Math.max(0, task.remainingSeconds - delta); task.focusedSeconds = (task.focusedSeconds || 0) + consumed; task.lastTickAt = now; maybeWarn(task); if (task.remainingSeconds === 0) { task.status = 'failed'; task.failedAt = new Date().toISOString(); addEvent('timed_out', task); toast(`“${task.title}”倒计时结束。你有一次申辩机会。`); } }
function updatePausedTask(task) { if (task.status !== 'paused') return; const elapsed = Math.floor((Date.now() - task.pausedAt) / 1000); if (task.pauseUsedSeconds + elapsed >= PAUSE_LIMIT_SECONDS) { task.pauseUsedSeconds = PAUSE_LIMIT_SECONDS; task.status = 'in_progress'; task.lastTickAt = Date.now(); addEvent('pause_limit_reached', task); toast('15 分钟普通暂停已用完，已自动恢复专注。'); } }
function tick() { state.tasks.forEach(task => { updateRunningTask(task); updatePausedTask(task); }); saveState(); render(); if (!activeTask() && !state.tasks.some(task => task.status === 'paused')) stopTicker(); }
function startTicker() { if (!timerId) timerId = setInterval(tick, 1000); }
function stopTicker() { clearInterval(timerId); timerId = null; }

function openNodes(task) { editingNodesFor = task.id; els.nodeDialogTitle.textContent = `拆分：${task.title}`; renderNodeInputs(task.nodes); els.nodeDialog.showModal(); }
function renderNodeInputs(nodes) { const source = nodes.length ? nodes : [{ id: uid(), title: '', minutes: '', done: false }]; els.nodeList.innerHTML = source.map(node => `<div class="node-line" data-node-id="${node.id}"><input class="node-done" type="checkbox" ${node.done ? 'checked' : ''} aria-label="完成节点"><input class="node-title" maxlength="50" value="${escapeHtml(node.title)}" placeholder="节点内容"><input class="node-minutes" type="number" min="1" max="1440" value="${node.minutes || ''}" placeholder="分钟"><button class="node-remove" type="button" aria-label="删除节点">×</button></div>`).join(''); els.addNodeButton.disabled = source.length >= MAX_NODES; }
function saveNodes() { const task = state.tasks.find(item => item.id === editingNodesFor); if (!task) return; const previousDone = task.nodes.filter(node => node.done).length; const lines = [...els.nodeList.querySelectorAll('.node-line')]; const nodes = lines.map(line => ({ id: line.dataset.nodeId, title: line.querySelector('.node-title').value.trim(), minutes: Number(line.querySelector('.node-minutes').value) || 0, done: line.querySelector('.node-done').checked })).filter(node => node.title); if (nodes.length > MAX_NODES) return; task.nodes = nodes; if (!nodes.length) task.manualProgress = 0; addEvent('nodes_updated', task); saveState(); render(); const newlyDone = nodes.filter(node => node.done).length > previousDone; toast(newlyDone ? randomItem(NODE_ENCOURAGEMENT) : nodes.length ? '节点已保存，完成一格就前进一步。' : '已清空节点，可直接完成或后续再拆分。'); }

function maybeWarn(task) {
  if (task.warned || task.remainingSeconds > 30 * 60 || taskProgress(task) >= 60) return;
  task.warned = true; addEvent('warning_shown', task); saveState();
  els.warningTitle.textContent = `“${task.title}”进入最后 30 分钟`;
  els.warningCopy.textContent = `${WARNING_COPY[state.settings.promptStyle]}${state.settings.guiltCopy ? ' 这是今天亲手写下的承诺，请别轻易让它落空。' : ''}`;
  if (!els.warningDialog.open) els.warningDialog.showModal();
}

function celebrate() {
  if (state.settings.reduceMotion) return;
  els.celebration.hidden = false;
  clearTimeout(celebrate.timer);
  celebrate.timer = setTimeout(() => { els.celebration.hidden = true; }, 1800);
}

function rewardBatch() {
  const shuffled = [...state.rewards].sort(() => Math.random() - .5);
  return shuffled.slice(0, Math.min(3, shuffled.length));
}
function showRewardBatch() {
  selectedReward = null; els.claimReward.disabled = true;
  els.rewardOptions.innerHTML = rewardBatch().map(item => `<button type="button" data-reward-id="${item.id}">${escapeHtml(item.content)}</button>`).join('') || '<p class="muted">奖励池为空，请先在“我的”中添加奖励。</p>';
}
function openRewardDialog(task) {
  if (!state.rewards.length) return;
  pendingRewardTaskId = task.id; els.rewardTaskName.textContent = `对应任务：${task.title}`; showRewardBatch();
  setTimeout(() => { if (!els.rewardDialog.open) els.rewardDialog.showModal(); }, state.settings.reduceMotion ? 0 : 350);
}
function claimReward() {
  const task = state.tasks.find(item => item.id === pendingRewardTaskId); const reward = state.rewards.find(item => item.id === selectedReward);
  if (!task || !reward) return;
  state.claimedRewards.push({ id: uid(), rewardId: reward.id, content: reward.content, taskId: task.id, taskTitle: task.title, claimedAt: new Date().toISOString() });
  addEvent('reward_claimed', task, { reward: reward.content }); saveState(); els.rewardDialog.close(); toast(`已领取：${reward.content}`);
}
function checkStageRewards() {
  const minutes = Math.floor(totalFocusSeconds() / 60); const milestones = [{ minutes: 120, reward: '两小时专注徽章' }, { minutes: 300, reward: '五小时坚持徽章' }, { minutes: 600, reward: '十小时兑现徽章' }];
  const unlocked = milestones.filter(item => minutes >= item.minutes && !state.stageRewardsUnlocked.includes(item.minutes));
  unlocked.forEach(item => { state.stageRewardsUnlocked.push(item.minutes); state.events.push({ id: uid(), type: 'stage_reward', at: new Date().toISOString(), date: dateKey(), reward: item.reward }); });
  if (unlocked.length) { saveState(); setTimeout(() => toast(`阶段奖励解锁：${unlocked.at(-1).reward}`), 1900); }
}

function checkNoPlanPenalty() {
  const now = new Date(); const [hour, minute] = state.settings.reminderTime.split(':').map(Number); const deadline = new Date(now); deadline.setHours(hour, minute + 30, 0, 0);
  if (now < deadline || todayTasks().length || isFreeDay(dateKey()) || !state.punishments.length) return;
  let record = state.penaltyRecords.find(item => item.date === dateKey());
  if (!record) { const punishment = randomItem(state.punishments); record = { id: uid(), date: dateKey(), punishmentId: punishment.id, content: punishment.content, status: 'pending', triggeredAt: new Date().toISOString() }; state.penaltyRecords.push(record); saveState(); }
  if (record.status === 'pending' && (!record.snoozedUntil || Date.now() >= record.snoozedUntil) && !els.penaltyDialog.open) { pendingPenaltyId = record.id; els.penaltyContent.textContent = record.content; els.penaltyDialog.showModal(); }
}

function openAppeal(task) { if (task.appealUsed) return; pendingAppealTaskId = task.id; els.appealForm.reset(); els.appealDialog.showModal(); }

els.taskForm.addEventListener('submit', event => { event.preventDefault(); const title = els.title.value.trim(); const minutes = Number(els.minutes.value); els.formMessage.textContent = ''; if (!title) { els.formMessage.textContent = '请写下要学习的内容。'; return; } if (!Number.isInteger(minutes) || minutes < 1) { els.formMessage.textContent = '请输入至少 1 分钟的预计时长。'; return; } if (!isTimeAllowed(minutes)) { els.formMessage.textContent = '预计时长会跨过今天 24:00，请缩短时长或明天再计划。'; return; } createTask(title, minutes); els.taskForm.reset(); });
els.taskList.addEventListener('click', event => { const button = event.target.closest('button[data-action]'); if (!button) return; const task = state.tasks.find(item => item.id === button.closest('[data-task-id]').dataset.taskId); if (!task) return; const action = button.dataset.action; if (action === 'start') task.status === 'paused' ? resumeTask(task) : startTask(task); if (action === 'complete') completeTask(task); if (action === 'nodes') openNodes(task); if (action === 'appeal') openAppeal(task); if (action === 'edit') editTask(task); if (action === 'delete') deleteTask(task); });
els.pauseButton.addEventListener('click', () => { const task = activeTask(); if (task) pauseTask(task); });
els.finishButton.addEventListener('click', () => completeTask(activeTask()));
els.focusTaskButton.addEventListener('click', () => { switchView('today'); requestAnimationFrame(() => document.querySelector('.task-card.running')?.scrollIntoView({ behavior: 'smooth', block: 'center' })); });
els.todayButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => switchView(button.dataset.target)));
document.querySelector('#view-calendar').addEventListener('click', event => {
  const dateButton = event.target.closest('[data-date]');
  if (dateButton) { selectedCalendarDate = dateButton.dataset.date; els.freeDayDate.value = selectedCalendarDate; renderCalendar(); return; }
  const makeupButton = event.target.closest('[data-makeup-task]');
  if (makeupButton) { const task = state.tasks.find(item => item.id === makeupButton.dataset.makeupTask); if (task) completeTask(task, true); }
});
els.useFreeDay.addEventListener('click', () => {
  const key = els.freeDayDate.value;
  if (!key) { toast('请先选择自由日日期。'); return; }
  if (isFreeDay(key)) { toast('这一天已经是自由日。'); return; }
  if (tasksForDate(key).length) { toast('该日期已有任务，请选择没有任务的一天。'); return; }
  if (availableFreeDayCards() < 1) { toast('自由日卡不足，每 7 个绿钩日可解锁 1 张。'); return; }
  state.freeDays.push(key); state.events.push({ id: uid(), type: 'free_day_used', at: new Date().toISOString(), date: key }); selectedCalendarDate = key; saveState(); render(); toast('自由日已启用，这一天无需创建任务。');
});
els.promptStyle.addEventListener('change', () => { state.settings.promptStyle = els.promptStyle.value; saveState(); });
els.guiltCopy.addEventListener('change', () => { state.settings.guiltCopy = els.guiltCopy.checked; saveState(); });
els.reduceMotion.addEventListener('change', () => { state.settings.reduceMotion = els.reduceMotion.checked; saveState(); renderPreferences(); });
els.rewardForm.addEventListener('submit', event => { event.preventDefault(); const content = els.rewardInput.value.trim(); if (!content) return; state.rewards.push({ id: uid(), content }); els.rewardForm.reset(); saveState(); renderPools(); });
els.punishmentForm.addEventListener('submit', event => { event.preventDefault(); const content = els.punishmentInput.value.trim(); if (!content) return; state.punishments.push({ id: uid(), content }); els.punishmentForm.reset(); saveState(); renderPools(); });
els.rewardList.addEventListener('click', event => { const button = event.target.closest('[data-remove-reward]'); if (!button) return; state.rewards = state.rewards.filter(item => item.id !== button.dataset.removeReward); saveState(); renderPools(); });
els.punishmentList.addEventListener('click', event => { const button = event.target.closest('[data-remove-punishment]'); if (!button) return; state.punishments = state.punishments.filter(item => item.id !== button.dataset.removePunishment); saveState(); renderPools(); });
els.warningContinue.addEventListener('click', () => els.warningDialog.close());
els.rewardOptions.addEventListener('click', event => { const button = event.target.closest('[data-reward-id]'); if (!button) return; selectedReward = button.dataset.rewardId; els.rewardOptions.querySelectorAll('button').forEach(item => item.classList.toggle('selected', item === button)); els.claimReward.disabled = false; });
els.shuffleRewards.addEventListener('click', showRewardBatch);
els.claimReward.addEventListener('click', claimReward);
els.penaltyLater.addEventListener('click', () => { const record = state.penaltyRecords.find(item => item.id === pendingPenaltyId); if (record) record.snoozedUntil = Date.now() + 30 * 60000; saveState(); els.penaltyDialog.close(); });
els.penaltyDone.addEventListener('click', () => { const record = state.penaltyRecords.find(item => item.id === pendingPenaltyId); if (record) { record.status = 'completed'; record.completedAt = new Date().toISOString(); } saveState(); els.penaltyDialog.close(); toast('已记录完成。约束的价值来自你的诚信。'); });
els.appealClose.addEventListener('click', () => els.appealDialog.close());
els.appealForm.addEventListener('submit', event => { event.preventDefault(); const task = state.tasks.find(item => item.id === pendingAppealTaskId); const reason = els.appealReason.value.trim(); if (!task || !reason || !els.appealHonesty.checked) return; task.status = 'makeup'; task.appealUsed = true; task.appealReason = reason; addEvent('appealed', task, { reason }); saveState(); els.appealDialog.close(); render(); toast('已转为黄色待补，原计划日期会一直保留。'); });
els.addNodeButton.addEventListener('click', () => { const nodes = [...els.nodeList.querySelectorAll('.node-line')]; if (nodes.length >= MAX_NODES) return; const placeholder = document.createElement('div'); placeholder.className = 'node-line'; placeholder.dataset.nodeId = uid(); placeholder.innerHTML = '<input class="node-done" type="checkbox" aria-label="完成节点"><input class="node-title" maxlength="50" placeholder="节点内容"><input class="node-minutes" type="number" min="1" max="1440" placeholder="分钟"><button class="node-remove" type="button" aria-label="删除节点">×</button>'; els.nodeList.append(placeholder); els.addNodeButton.disabled = nodes.length + 1 >= MAX_NODES; placeholder.querySelector('.node-title').focus(); });
els.nodeList.addEventListener('click', event => { if (!event.target.closest('.node-remove')) return; event.target.closest('.node-line').remove(); els.addNodeButton.disabled = els.nodeList.querySelectorAll('.node-line').length >= MAX_NODES; });
els.nodeForm.addEventListener('submit', event => { if (event.submitter?.value === 'cancel') return; event.preventDefault(); saveNodes(); els.nodeDialog.close(); });

function editTask(task) { if (task.status === 'in_progress') { toast('正在专注的任务请先暂停，再编辑。'); return; } const title = prompt('学习内容', task.title); if (title === null) return; const trimmed = title.trim(); if (!trimmed) { toast('任务内容不能为空。'); return; } const minutesText = prompt('预计时长（分钟）', task.plannedMinutes); if (minutesText === null) return; const minutes = Number(minutesText); if (!Number.isInteger(minutes) || minutes < 1 || !isTimeAllowed(minutes)) { toast('时长无效，或会跨过今天 24:00。'); return; } const elapsed = taskElapsed(task); task.title = trimmed; task.plannedMinutes = minutes; task.plannedSeconds = minutes * 60; task.remainingSeconds = Math.max(0, task.plannedSeconds - elapsed); addEvent('edited', task); saveState(); render(); toast('任务已更新。'); }
function deleteTask(task) { const first = confirm(`确定删除“${task.title}”吗？`); if (!first) return; if (task.status === 'in_progress' || task.status === 'paused') { const second = confirm('任务已经开始。再次确认后将作为“主动放弃”保留在日总结中，确定继续吗？'); if (!second) return; task.status = 'abandoned'; addEvent('abandoned', task); saveState(); render(); toast('已记为主动放弃，记录会保留在今日总结。'); return; } state.tasks = state.tasks.filter(item => item.id !== task.id); state.events = state.events.filter(event => event.taskId !== task.id); saveState(); render(); toast('任务已删除。'); }

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
state.tasks.forEach(task => { if (task.status === 'in_progress') { task.status = 'paused'; task.pausedAt = Date.now(); } });
saveState(); render(); switchView(currentView); if (state.tasks.some(task => task.status === 'paused')) startTicker(); setTimeout(checkNoPlanPenalty, 600); setInterval(checkNoPlanPenalty, 60000);
