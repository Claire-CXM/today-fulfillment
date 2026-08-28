import { defineCustomElements } from './node_modules/@ionic/core/loader/index.es2017.js';
import {
  PAUSE_LIMIT_COUNT,
  PAUSE_LIMIT_SECONDS,
  advanceRunningTimer,
  availableMinutesUntilMidnight,
  calendarStateForTasks,
  durationToMinutes,
  effectivePauseSeconds,
  freeDayCards,
  isTaskTimeAllowed,
  monthCompletionRate,
  nodeDurationValid,
  nextReminderTime,
  pickSuggestionBatch,
  reviewAppeal,
  sortTasksForDisplay,
  taskProgress,
  warningMinutes
} from './logic.js?v=28';
import { flushPersistedState, loadPersistedState, requestPersistentStorage, savePersistedState } from './storage.js?v=28';
import { configureAnalytics, durationBucket, shouldTrackDailyFulfillment, trackAnalyticsEvent } from './analytics.js?v=28';

defineCustomElements(window);

const MAX_NODES = 10;
const SUGGESTION_POOL = [
  { id: 'review-key-point', title: '复习今天最重要的知识点', minutes: 30 },
  { id: 'practice-corrections', title: '完成一组练习并订正', minutes: 45 },
  { id: 'organize-notes', title: '整理笔记并写下明日重点', minutes: 20 },
  { id: 'recite-core', title: '背诵并默写一组核心内容', minutes: 25 },
  { id: 'preview-next', title: '预习下一节并标出疑问', minutes: 30 },
  { id: 'error-review', title: '整理近期错题并总结原因', minutes: 40 },
  { id: 'deep-reading', title: '精读一篇材料并写摘要', minutes: 35 },
  { id: 'explain-aloud', title: '用自己的话讲清一个难点', minutes: 20 },
  { id: 'weekly-review', title: '回顾本周进度并调整计划', minutes: 30 }
];
const DEFAULT_REWARDS = ['看一集喜欢的节目', '喝一杯喜欢的饮品', '自由放松 20 分钟', '散步听歌 15 分钟', '吃一份小甜点'];
const DEFAULT_PUNISHMENTS = ['整理书桌 10 分钟', '额外复习 10 分钟', '做 15 个深蹲', '当天减少娱乐 20 分钟'];
const WARNING_COPY = {
  gentle: '时间有点紧，但你已经走到这里了。先完成最关键的一步，再决定是否调整。',
  direct: '任务已进入最后五分之一，当前进度低于 60%。停止分心，立刻推进核心节点。',
  humorous: '倒计时已经开始敲桌子了。别和进度条互相装没看见，先干最关键的。'
};
const NODE_ENCOURAGEMENT = ['这一格完成得很扎实。', '节点已拿下，继续保持节奏。', '很好，进度正在变成结果。', '又兑现了一小步。'];

const $ = selector => document.querySelector(selector);
const els = {
  taskList: $('#task-list'), taskForm: $('#task-form'), title: $('#task-title'), duration: $('#task-duration'), formMessage: $('#form-message'), taskCount: $('#task-count'), dailyScore: $('#daily-score'), dailyJourney: $('#daily-journey'), dailyPathFill: $('#daily-path-fill'), dailyPathCaption: $('#daily-path-caption'), dailyNote: $('#daily-note'), todayButton: $('#today-button'), openCreateTask: $('#open-create-task'), closeTaskEditor: $('#close-task-editor'), cancelTaskEditor: $('#cancel-task-editor'), taskEditorEyebrow: $('#task-editor-eyebrow'), taskEditorHeading: $('#task-editor-heading'), saveTaskButton: $('#save-task-button'), durationHint: $('#duration-hint'), suggestionCard: $('#suggestion-card'), suggestionList: $('#suggestion-list'), shuffleSuggestions: $('#shuffle-suggestions'), publishAllSuggestions: $('#publish-all-suggestions'), todayStageCard: $('#today-stage-card'),
  focusTitle: $('#focus-title'), focusState: $('#focus-state'), timer: $('#timer'), focusProgress: $('#focus-progress'), focusProgressBar: $('#focus-progress-bar'), focusNodeList: $('#focus-node-list'), pauseButton: $('#pause-button'), finishButton: $('#finish-button'), interruptButton: $('#interrupt-button'), pauseHint: $('#pause-hint'), leaveFocus: $('#leave-focus'), floatTimerButton: $('#float-timer-button'), miniFocusBar: $('#mini-focus-bar'), miniFocusTitle: $('#mini-focus-title'), miniFocusTime: $('#mini-focus-time'),
  monthCalendar: $('#month-calendar'), monthLabel: $('#month-label'), previousMonth: $('#previous-month'), nextMonth: $('#next-month'), dayDetail: $('#day-detail'), freeDayCount: $('#free-day-count'), freeDayDate: $('#free-day-date'), useFreeDay: $('#use-free-day'), summaryFocus: $('#summary-focus'), summaryPauses: $('#summary-pauses'), summaryProgress: $('#summary-progress'), abandonNote: $('#abandon-note'), dailyReport: $('#daily-report'), monthlyReport: $('#monthly-report'),
  promptStyle: $('#prompt-style'), guiltCopy: $('#guilt-copy'), reduceMotion: $('#reduce-motion'), usageAnalytics: $('#usage-analytics'), reminderTime: $('#reminder-time'), notificationPermission: $('#notification-permission'), notificationStatus: $('#notification-status'), testNotification: $('#test-notification'), reminderDiagnostics: $('#reminder-diagnostics'), rewardForm: $('#reward-form'), rewardInput: $('#reward-input'), rewardList: $('#reward-list'), rewardHistory: $('#reward-history'), rewardCount: $('#reward-count'), punishmentForm: $('#punishment-form'), punishmentInput: $('#punishment-input'), punishmentList: $('#punishment-list'), penaltyHistory: $('#penalty-history'), punishmentCount: $('#punishment-count'), stageRewardCard: $('#stage-reward-card'),
  warningDialog: $('#warning-dialog'), warningTitle: $('#warning-title'), warningCopy: $('#warning-copy'), warningContinue: $('#warning-continue'), rewardDialog: $('#reward-dialog'), rewardTaskName: $('#reward-task-name'), rewardOptions: $('#reward-options'), shuffleRewards: $('#shuffle-rewards'), claimReward: $('#claim-reward'), penaltyDialog: $('#penalty-dialog'), penaltyTitle: $('#penalty-title'), penaltyTrigger: $('#penalty-trigger'), penaltyContent: $('#penalty-content'), penaltyLater: $('#penalty-later'), penaltyDone: $('#penalty-done'), appealDialog: $('#appeal-dialog'), appealForm: $('#appeal-form'), appealReason: $('#appeal-reason'), appealHonesty: $('#appeal-honesty'), appealClose: $('#appeal-close'), appealResult: $('#appeal-result'), interruptDialog: $('#interrupt-dialog'), interruptForm: $('#interrupt-form'), interruptReason: $('#interrupt-reason'), interruptClose: $('#interrupt-close'), confirmDialog: $('#confirm-dialog'), confirmTitle: $('#confirm-title'), confirmMessage: $('#confirm-message'), confirmCancel: $('#confirm-cancel'), confirmAccept: $('#confirm-accept'), ionicAlert: $('#ionic-alert'), celebration: $('#celebration'), todayNavBadge: $('#today-nav-badge'), toast: $('#toast'), nodeDialog: $('#node-dialog'), nodeDialogTitle: $('#node-dialog-title'), nodeForm: $('#node-form'), nodeList: $('#node-list'), nodeAllocation: $('#node-allocation'), addNodeButton: $('#add-node-button'), smartSplitButton: $('#smart-split-button'), abandonFocusButton: $('#abandon-focus-button')
};

let state = freshState();
let appInitialized = false;
let currentSuggestions = pickSuggestionBatch(SUGGESTION_POOL);
let editingNodesFor = null;
let timerId = null;
let reminderTimerId = null;
let currentView = 'today';
let selectedCalendarDate = dateKey();
let calendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let pendingRewardTaskId = null;
let selectedReward = null;
let pendingPenaltyId = null;
let pendingAppealTaskId = null;
let editingTaskId = null;
let durationUnit = 'minutes';
let confirmResolver = null;
let pipWindow = null;
let pipTimeElement = null;
let pendingFulfillmentTrackingDate = null;

function dateKey(date = new Date()) { const offset = date.getTimezoneOffset() * 60000; return new Date(date - offset).toISOString().slice(0, 10); }
function localDate(date = new Date()) { return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(date); }
function uid() { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`; }
function freshState() { return { tasks: [], events: [], rewards: DEFAULT_REWARDS.map(content => ({ id: uid(), content })), punishments: DEFAULT_PUNISHMENTS.map(content => ({ id: uid(), content })), claimedRewards: [], penaltyRecords: [], freeDays: [], stageRewardsUnlocked: [], reminderDeliveries: [], reminderDiagnostics: { lastCheckedAt: null, lastResult: 'never', lastDeliveredAt: null, lastError: null, nextScheduledAt: null, backgroundMode: 'foreground_only', backgroundError: null }, monthlyReports: [], analytics: { lastFulfillmentDate: null }, settings: { promptStyle: 'gentle', guiltCopy: false, reduceMotion: false, usageAnalytics: true, reminderTime: '10:00' } }; }
function normalizeState(persisted) {
    const parsed = persisted && Array.isArray(persisted.tasks) ? persisted : freshState();
    const defaults = freshState();
    parsed.events ||= [];
    parsed.rewards = Array.isArray(parsed.rewards) ? parsed.rewards : defaults.rewards;
    parsed.punishments = Array.isArray(parsed.punishments) ? parsed.punishments : defaults.punishments;
    parsed.claimedRewards ||= [];
    parsed.penaltyRecords ||= [];
    parsed.freeDays ||= [];
    parsed.stageRewardsUnlocked ||= [];
    parsed.reminderDeliveries ||= [];
    parsed.reminderDiagnostics = { ...defaults.reminderDiagnostics, ...(parsed.reminderDiagnostics || {}) };
    parsed.monthlyReports ||= [];
    parsed.analytics = { ...defaults.analytics, ...(parsed.analytics || {}) };
    parsed.settings = { ...defaults.settings, ...(parsed.settings || {}) };
    parsed.tasks.forEach(task => {
      task.nodes ||= [];
      task.warned = Boolean(task.warned);
      task.appealUsed = Boolean(task.appealUsed);
      task.pauseCount ||= 0;
      task.pauseUsedSeconds ||= 0;
      task.manualProgress ||= 0;
      task.plannedMinutes = Number(task.plannedMinutes) || Math.max(1, Math.round((task.plannedSeconds || 60) / 60));
      task.plannedSeconds ||= task.plannedMinutes * 60;
      task.remainingSeconds = Math.max(0, Number(task.remainingSeconds ?? task.plannedSeconds));
      task.focusedSeconds ??= task.startedAt ? Math.max(0, task.plannedSeconds - task.remainingSeconds) : 0;
    });
    return parsed;
}
function saveState() { if (appInitialized) savePersistedState(state); }
function todayTasks() { return state.tasks.filter(task => task.date === dateKey()); }
function visibleTasks() { return sortTasksForDisplay(todayTasks().filter(task => task.status !== 'abandoned')); }
function activeTask() { return state.tasks.find(task => task.status === 'in_progress'); }
function pausedTask() { return state.tasks.find(task => task.status === 'paused'); }
function focusTask() { return activeTask() || pausedTask(); }
function taskElapsed(task) { return Math.max(0, task.focusedSeconds || 0); }
function formatTime(seconds) { const safe = Math.max(0, Math.round(seconds)); const hours = Math.floor(safe / 3600); const minutes = Math.floor((safe % 3600) / 60); const secs = safe % 60; return hours ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`; }
function formatDuration(minutes) { const safe = Number(minutes); return safe >= 60 ? `${Number((safe / 60).toFixed(2))} 小时` : `${safe} 分钟`; }
function taskStatus(task) { return ({ planned: '待开始', makeup: '黄色待补', in_progress: '专注中', paused: '普通暂停', interrupted: '特殊中断', completed: '已完成', failed: '已结束', abandoned: '已放弃' })[task.status] || '待开始'; }
function toast(message) { els.toast.textContent = message; els.toast.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => els.toast.classList.remove('show'), 3200); }
function availableTodayMinutes(excludeTaskId = null) { return availableMinutesUntilMidnight(new Date(), todayTasks(), excludeTaskId); }
function isTimeAllowed(minutes, excludeTaskId = null) { return isTaskTimeAllowed(new Date(), todayTasks(), minutes, excludeTaskId); }
function addEvent(type, task, details = {}) { state.events.push({ id: uid(), type, taskId: task.id, taskTitle: task.title, at: new Date().toISOString(), date: task.date, ...details }); }
function dateFromKey(key) { return new Date(`${key}T12:00:00`); }
function tasksForDate(key) { return state.tasks.filter(task => task.date === key); }
function isFreeDay(key) { return state.freeDays.includes(key); }
function completedTasks(tasks) { return tasks.filter(task => task.status === 'completed').length; }
function greenDayCount() {
  const dates = [...new Set(state.tasks.map(task => task.date))];
  return dates.filter(key => calendarState(dateFromKey(key)) === 'green').length;
}
function availableFreeDayCards() { return freeDayCards(greenDayCount(), state.freeDays.length); }
function totalFocusSeconds(tasks = state.tasks) { return tasks.reduce((sum, task) => sum + taskElapsed(task), 0); }
function randomItem(items) { return items[Math.floor(Math.random() * items.length)]; }

function render() {
  const tasks = visibleTasks();
  const completed = tasks.filter(task => task.status === 'completed').length;
  els.todayButton.textContent = localDate().replace(/(周[一二三四五六日])$/, ' $1');
  els.taskCount.textContent = `${tasks.length}项任务`;
  els.dailyScore.textContent = `${completed}/${tasks.length}`;
  const dailyProgress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  els.dailyPathFill.style.width = `${dailyProgress}%`;
  els.dailyJourney.dataset.stage = !tasks.length ? 'empty' : completed === tasks.length ? 'done' : 'focus';
  els.dailyPathCaption.textContent = !tasks.length ? '先种下一件要兑现的事' : completed === tasks.length ? '今天的花径已经走完' : completed ? `已走完 ${completed} 件，继续下一件` : '计划已写下，现在开始行动';
  els.dailyNote.textContent = tasks.length ? (completed === tasks.length ? '今天的承诺，已经全部兑现。' : '从最重要的一件开始。') : '先写下一件真正要完成的事。';
  const pending = tasks.filter(task => task.status !== 'completed' && task.status !== 'failed').length;
  els.todayNavBadge.hidden = pending === 0;
  els.todayNavBadge.textContent = pending > 9 ? '9+' : String(pending);
  renderTaskList(tasks);
  renderSuggestions(tasks);
  renderFocus();
  renderCalendar();
  renderSummary(tasks);
  renderReports();
  renderPreferences();
  renderPools();
  renderStageRewards();
}

function switchView(viewName) {
  const target = document.querySelector(`.app-view[data-view="${viewName}"]`);
  if (!target) return;
  currentView = viewName;
  document.body.dataset.view = viewName;
  document.querySelectorAll('.app-view').forEach(view => { view.hidden = view !== target; });
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.querySelectorAll('.nav-item').forEach(button => {
    const active = button.dataset.target === viewName;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  document.body.classList.toggle('subpage-open', ['task-editor','focus'].includes(viewName));
  renderFocus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.switchAppView = switchView;

function renderTaskList(tasks) {
  if (!tasks.length) { els.taskList.innerHTML = `<div class="empty-state"><img class="empty-state-asset" src="assets/growth-badge.png" alt="植物成长徽章"><h3>今天还没有正式任务</h3><p>先从下面的建议开始，或新建一个真正想兑现的目标。</p><button class="button primary" type="button" data-action="create">新建第一个任务</button></div>`; return; }
  els.taskList.innerHTML = tasks.map(task => {
    const progress = taskProgress(task); const nodes = task.nodes.slice(0, 4).map(node => `<span class="node-pill ${node.done ? 'done' : ''}">${escapeHtml(node.title || '未命名节点')}</span>`).join('');
    const plannedActions = task.status === 'planned' ? `<button class="button primary" data-action="start" type="button">开始</button><details class="task-more"><summary>更多</summary><div class="task-more-menu"><button class="button quiet" data-action="nodes" type="button">${task.nodes.length ? '编辑节点' : '拆分节点'}</button><button class="button quiet" data-action="complete" type="button">直接完成</button><button class="button quiet" data-action="edit" type="button">编辑任务</button><button class="button danger" data-action="delete" type="button">删除任务</button></div></details>` : '';
    const focusActions = ['in_progress','paused'].includes(task.status) ? '<button class="button primary" data-action="focus" type="button">继续专注</button><details class="task-more"><summary>更多</summary><div class="task-more-menu"><button class="button danger" data-action="abandon" type="button">主动放弃</button></div></details>' : '';
    const interruptedActions = task.status === 'interrupted' ? '<button class="button primary" data-action="start" type="button">继续专注</button><details class="task-more"><summary>更多</summary><div class="task-more-menu"><button class="button danger" data-action="abandon" type="button">主动放弃</button></div></details>' : '';
    const failedActions = task.status === 'failed' && !task.appealUsed ? '<button class="button primary" data-action="appeal" type="button">申请待补</button><details class="task-more"><summary>更多</summary><div class="task-more-menu"><button class="button quiet" data-action="waive-appeal" type="button">放弃申辩</button></div></details>' : '';
    const iconName = task.status === 'planned' ? 'book-outline' : task.status === 'completed' ? 'document-text-outline' : task.status === 'failed' ? 'alert-circle-outline' : task.status === 'makeup' ? 'refresh-circle-outline' : 'list-outline';
    const nodeProgress = task.nodes.length ? `<div class="task-progress" aria-label="节点完成进度 ${progress}%"><span style="width:${progress}%"></span></div><div class="progress-row"><span>${task.nodes.filter(node => node.done).length}/${task.nodes.length} 个节点</span><strong>${progress}%</strong></div><div class="node-preview">${nodes}${task.nodes.length > 4 ? `<span class="node-pill">+${task.nodes.length - 4}</span>` : ''}</div>` : '';
    return `<article class="task-card ${task.status}" data-task-id="${task.id}"><div class="task-state-icon"><img src="assets/icons/${iconName}.svg" alt=""></div><div class="task-card-body"><div class="task-row"><div><h3 class="task-title">${escapeHtml(task.title)}</h3><p class="task-meta">预计 ${formatDuration(task.plannedMinutes)} · 剩余 ${formatTime(task.remainingSeconds)}</p></div><span class="status ${task.status}">${taskStatus(task)}</span></div>${nodeProgress}<div class="task-actions">${plannedActions}${focusActions}${interruptedActions}${failedActions}</div></div></article>`;
  }).join('');
}

function renderSuggestions(tasks) {
  const show = tasks.length === 0 && !isFreeDay(dateKey());
  els.suggestionCard.hidden = !show;
  if (!show) return;
  els.suggestionList.innerHTML = currentSuggestions.map((item, index) => `<article><div><span>建议 ${index + 1}</span><h3>${escapeHtml(item.title)}</h3><p>${item.minutes} 分钟</p></div><button class="button quiet" type="button" data-publish-suggestion="${index}">发布</button></article>`).join('');
}

function renderFocus() {
  const task = focusTask();
  els.miniFocusBar.hidden = !task || currentView === 'focus';
  if (!task) return;
  els.focusTitle.textContent = task.title;
  els.timer.textContent = formatTime(task.remainingSeconds);
  els.miniFocusTitle.textContent = task.status === 'paused' ? `已暂停 · ${task.title}` : task.title;
  els.miniFocusTime.textContent = formatTime(task.remainingSeconds);
  if (pipTimeElement) pipTimeElement.textContent = formatTime(task.remainingSeconds);
  const progress = taskProgress(task);
  els.focusProgress.hidden = !task.nodes.length;
  els.focusProgressBar.style.width = `${progress}%`;
  els.focusState.textContent = task.status === 'paused' ? '普通暂停中' : task.nodes.length ? `已完成 ${progress}%` : '保持专注';
  const pauseRemaining = Math.max(0, PAUSE_LIMIT_SECONDS - effectivePauseSeconds(task));
  els.pauseHint.textContent = `普通暂停剩余 ${Math.max(0, PAUSE_LIMIT_COUNT - task.pauseCount)} 次 · ${formatTime(pauseRemaining)}`;
  els.pauseButton.textContent = task.status === 'paused' ? '继续专注' : '普通暂停';
  els.pauseButton.disabled = task.status !== 'paused' && (task.pauseCount >= PAUSE_LIMIT_COUNT || pauseRemaining === 0);
  els.focusNodeList.innerHTML = task.nodes.length ? task.nodes.map(node => `<label class="focus-node ${node.done ? 'done' : ''}"><input type="checkbox" data-focus-node="${node.id}" ${node.done ? 'checked' : ''}><span><strong>${escapeHtml(node.title)}</strong><small>${node.minutes} 分钟</small></span></label>`).join('') : '';
  els.finishButton.disabled = Boolean(task.nodes.length && progress < 100);
  els.finishButton.textContent = task.nodes.length ? '完成任务' : '直接完成';
}

function calendarState(day) {
  const key = dateKey(day);
  return calendarStateForTasks(tasksForDate(key), { free: isFreeDay(key), future: key > dateKey() });
}
function renderCalendar() {
  const year = calendarCursor.getFullYear(); const month = calendarCursor.getMonth(); const first = new Date(year, month, 1); const leading = (first.getDay() + 6) % 7; const total = new Date(year, month + 1, 0).getDate();
  els.monthLabel.textContent = `${year} 年 ${month + 1} 月`;
  els.monthCalendar.innerHTML = `${'<span class="month-blank"></span>'.repeat(leading)}${Array.from({ length: total }, (_, index) => { const day = new Date(year, month, index + 1); const key = dateKey(day); const stateName = calendarState(day); const future = stateName === 'future'; const stateLabel = ({ green: '全部完成', yellow: '部分完成', red: '未完成', free: '自由日' })[stateName] || '未来日期'; return `<button type="button" class="month-day ${stateName} ${key === dateKey() ? 'today' : ''} ${key === selectedCalendarDate ? 'selected' : ''}" data-date="${key}" aria-label="${month + 1}月${index + 1}日，${stateLabel}" ${future ? 'disabled aria-disabled="true"' : ''}><span>${index + 1}</span>${future ? '' : `<i class="calendar-dot ${stateName}" aria-hidden="true"></i>`}</button>`; }).join('')}`;
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
  if (isFreeDay(key)) { const canCancel = key > dateKey(); els.dayDetail.innerHTML = `<p class="eyebrow">${label}</p><h2>自由日</h2><p>这一天不需要创建任务，也不计入红黄绿完成率。</p>${canCancel ? `<button class="button quiet" type="button" data-cancel-free-day="${key}">取消并返还卡片</button>` : ''}`; return; }
  if (!tasks.length) { els.dayDetail.innerHTML = `<p class="eyebrow">${label}</p><h2>${stateName === 'future' ? '尚未到来' : '当日无任务'}</h2><p>${stateName === 'future' ? '未来日期暂不记录状态。' : '零完成或全天无任务记为红叉，不支持补做。'}</p>`; return; }
  const canMakeUp = stateName === 'yellow' && key < dateKey();
  els.dayDetail.innerHTML = `<p class="eyebrow">${label} · ${stateName === 'green' ? '全部完成' : stateName === 'yellow' ? '待补' : '未完成'}</p><h2>${completedTasks(tasks)}/${tasks.length} 个任务完成</h2><div class="makeup-list">${tasks.map(task => { const pending = canMakeUp && !['completed','abandoned'].includes(task.status); const progress = taskProgress(task); const controls = !pending ? '' : task.nodes.length ? `<div class="makeup-nodes">${task.nodes.map(node => `<label><input type="checkbox" data-makeup-node="${node.id}" data-task-id="${task.id}" ${node.done ? 'checked' : ''}><span>${escapeHtml(node.title)}</span></label>`).join('')}</div>` : `<label class="makeup-range"><span>补做进度 ${progress}%</span><input type="range" min="0" max="100" step="5" value="${progress}" data-makeup-progress data-task-id="${task.id}"></label>`; return `<article><div class="makeup-task-head"><span><strong>${escapeHtml(task.title)}</strong><small>${task.status === 'completed' ? `完成于 ${task.actualCompletedDate || task.date}` : taskStatus(task)}</small></span>${pending ? `<button class="button quiet" type="button" data-makeup-task="${task.id}" ${task.nodes.length && progress < 100 ? 'disabled' : ''}>补做完成</button>` : ''}</div>${controls}</article>`; }).join('')}</div>`;
}

function buildMonthReport(year, month, throughDay = new Date(year, month + 1, 0).getDate()) {
  const monthTasks = state.tasks.filter(task => { const day = dateFromKey(task.date); return day.getFullYear() === year && day.getMonth() === month; });
  const keys = Array.from({ length: throughDay }, (_, index) => dateKey(new Date(year, month, index + 1)));
  const counts = { green: 0, yellow: 0, red: 0, free: 0 };
  keys.forEach(key => { const name = calendarState(dateFromKey(key)); if (counts[name] !== undefined) counts[name] += 1; });
  const rate = monthCompletionRate(counts);
  const anomalies = state.events.filter(event => { const day = new Date(event.at); return day.getFullYear() === year && day.getMonth() === month && ['paused','appealed','abandoned','timed_out'].includes(event.type); }).length;
  return { period: `${year}-${String(month + 1).padStart(2, '0')}`, year, month, counts, rate, focusMinutes: Math.floor(totalFocusSeconds(monthTasks) / 60), anomalies, suggestion: rate >= 70 ? '节奏稳定，继续保持任务规模与可用时间匹配。' : '建议减少单日任务数量，优先守住最重要的一项。' };
}
function ensurePreviousMonthReport() {
  const now = new Date();
  if (now.getDate() !== 1) return;
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const period = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
  if (state.monthlyReports.some(report => report.period === period)) return;
  state.monthlyReports.push({ id: uid(), ...buildMonthReport(previous.getFullYear(), previous.getMonth()), generatedAt: new Date().toISOString() });
  saveState();
}
function renderReports() {
  const tasks = todayTasks(); const done = completedTasks(tasks); const allDone = tasks.length > 0 && done === tasks.length; const resolved = tasks.length > 0 && tasks.every(task => ['completed','failed','abandoned'].includes(task.status)); const pauses = tasks.reduce((sum, task) => sum + task.pauseCount, 0); const appeals = state.events.filter(event => event.date === dateKey() && event.type === 'appealed').length; const abandoned = tasks.filter(task => task.status === 'abandoned').length; const focusMinutes = Math.floor(totalFocusSeconds(tasks) / 60);
  if (isFreeDay(dateKey())) els.dailyReport.innerHTML = '<p class="eyebrow">日总结</p><h2>今天是自由日</h2><p>放心休息。休息不是中断成长，而是成长的一部分。</p>';
  else if (!tasks.length) els.dailyReport.innerHTML = '<p class="eyebrow">日总结</p><h2>今天还没有任务</h2><p>创建并结束至少一个任务后，这里会生成完整复盘。</p>';
  else if (!resolved) els.dailyReport.innerHTML = `<p class="eyebrow">日总结</p><h2>任务全部结束后生成</h2><p>当前已完成 ${done}/${tasks.length} 个任务。专注 ${focusMinutes} 分钟，普通暂停 ${pauses} 次。</p>`;
  else els.dailyReport.innerHTML = `<p class="eyebrow">日总结已生成</p><h2>${allDone ? '今天的承诺已经兑现' : '今天的结果已经如实记录'}</h2><div class="report-lines"><p><strong>完成情况</strong><span>${done}/${tasks.length} 个任务完成</span></p><p><strong>专注时长</strong><span>${focusMinutes} 分钟</span></p><p><strong>异常记录</strong><span>暂停 ${pauses} 次 · 申辩 ${appeals} 次 · 主动放弃 ${abandoned} 个</span></p><p><strong>做得好</strong><span>你把过程转化成了可复盘的真实记录。</span></p><p><strong>可改进</strong><span>${pauses > 1 ? '明天尝试减少中途切换，保护连续专注时间。' : allDone ? '保持今天的节奏，为最重要的任务预留充足时间。' : '明天减少任务规模，优先保证最重要的一项能够完成。'}</span></p></div><p class="encouragement">${allDone ? '今天不是“感觉努力”，而是真正完成。很好。' : '真实面对结果，就是下一次做得更好的起点。'}</p>`;
  const now = new Date();
  const archived = now.getDate() === 1 ? state.monthlyReports.at(-1) : null;
  const report = archived || buildMonthReport(now.getFullYear(), now.getMonth(), now.getDate());
  const prefix = archived ? '月总结' : '本月进度';
  els.monthlyReport.innerHTML = `<p class="eyebrow">${report.year} 年 ${report.month + 1} 月${prefix}</p><h2>完成率 ${report.rate}%</h2><div class="month-stats"><div><strong>${report.counts.green}</strong><span>全部完成</span></div><div><strong>${report.counts.yellow}</strong><span>部分完成</span></div><div><strong>${report.counts.red}</strong><span>未完成</span></div><div><strong>${report.counts.free}</strong><span>自由日</span></div></div><p>累计专注 ${report.focusMinutes} 分钟；异常记录 ${report.anomalies} 条。${report.suggestion}</p>`;
}

function renderPreferences() {
  els.promptStyle.value = state.settings.promptStyle;
  els.guiltCopy.checked = state.settings.guiltCopy;
  els.reduceMotion.checked = state.settings.reduceMotion;
  els.usageAnalytics.checked = state.settings.usageAnalytics;
  els.reminderTime.value = state.settings.reminderTime;
  if (!('Notification' in window)) {
    els.notificationStatus.textContent = '当前浏览器不支持通知';
    els.notificationPermission.disabled = true;
  } else {
    const labels = { granted: '通知已授权', denied: '通知已被浏览器拒绝', default: '尚未授权通知' };
    els.notificationStatus.textContent = `${labels[Notification.permission]}；${Notification.permission === 'granted' ? '前台精确提醒已启用' : '授权后才能发送提醒'}。`;
    els.notificationPermission.disabled = Notification.permission === 'granted';
    els.notificationPermission.textContent = Notification.permission === 'granted' ? '已授权' : '授权通知';
    els.testNotification.disabled = Notification.permission !== 'granted';
  }
  const diagnosticLabels = { never: '尚未执行提醒检查', waiting: '等待设定时间', skipped_tasks: '今天已有任务，已跳过计划提醒', skipped_free_day: '今天是自由日，已跳过计划提醒', already_delivered: '今天的提醒已发送', unsupported: '当前浏览器不支持系统通知', permission_denied: '通知权限未开启', service_worker_unavailable: '通知服务尚未就绪', delivered: '计划提醒发送成功', test_delivered: '测试通知发送成功', failed: '通知发送失败' };
  const diagnostic = state.reminderDiagnostics;
  const mode = diagnostic.backgroundMode === 'periodic_sync' ? '前台精确提醒 + PWA 后台补偿' : '前台精确提醒';
  const result = diagnosticLabels[diagnostic.lastResult] || diagnostic.lastResult;
  const checked = diagnostic.lastCheckedAt ? `；最近检查 ${new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(diagnostic.lastCheckedAt))}` : '';
  const next = diagnostic.nextScheduledAt ? `；下次前台检查 ${new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(diagnostic.nextScheduledAt))}` : '';
  const error = diagnostic.lastError ? `；失败原因：${diagnostic.lastError}` : diagnostic.backgroundError ? `；后台补偿未启用：${diagnostic.backgroundError}` : '';
  els.reminderDiagnostics.textContent = `${mode} · ${result}${checked}${next}${error}`;
  document.documentElement.classList.toggle('reduce-motion', state.settings.reduceMotion);
}
function renderPools() {
  els.rewardCount.textContent = `${state.rewards.length} 项`; els.punishmentCount.textContent = `${state.punishments.length} 项`;
  els.rewardList.innerHTML = state.rewards.map(item => `<span>${escapeHtml(item.content)}<button type="button" data-remove-reward="${item.id}" aria-label="删除奖励"><img src="node_modules/@ionic/core/dist/ionic/svg/close.svg" alt=""></button></span>`).join('');
  els.punishmentList.innerHTML = state.punishments.map(item => `<span>${escapeHtml(item.content)}<button type="button" data-remove-punishment="${item.id}" aria-label="删除惩罚"><img src="node_modules/@ionic/core/dist/ionic/svg/close.svg" alt=""></button></span>`).join('');
  els.rewardHistory.innerHTML = state.claimedRewards.length ? `<p class="eyebrow">最近领取</p>${state.claimedRewards.slice(-5).reverse().map(item => `<div><span><strong>${escapeHtml(item.content)}</strong><small>${escapeHtml(item.taskTitle)}</small></span><time>${new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(item.claimedAt))}</time></div>`).join('')}` : '';
  els.penaltyHistory.innerHTML = state.penaltyRecords.length ? `<p class="eyebrow">约束记录</p>${state.penaltyRecords.slice(-5).reverse().map(item => `<div><span><strong>${escapeHtml(item.content)}</strong><small>${item.status === 'completed' ? '已诚信完成' : '待确认完成'}</small></span><time>${item.date}</time></div>`).join('')}` : '';
}
function renderStageRewards() {
  const minutes = Math.floor(totalFocusSeconds() / 60);
  const milestones = [{ minutes: 120, reward: '两小时专注徽章' }, { minutes: 300, reward: '五小时坚持徽章' }, { minutes: 600, reward: '十小时兑现徽章' }];
  const next = milestones.find(item => !state.stageRewardsUnlocked.includes(item.minutes));
  const progress = next ? Math.min(100, Math.round(minutes / next.minutes * 100)) : 100;
  const markup = `<img class="stage-badge" src="assets/growth-badge.png" alt="植物成长徽章"><div class="stage-copy"><p class="eyebrow">阶段奖励</p><h2>${next ? `再专注 ${Math.max(0, next.minutes - minutes)} 分钟，解锁${next.reward}` : '当前阶段奖励已全部解锁'}</h2><p>累计专注 ${minutes} 分钟 · 已解锁 ${state.stageRewardsUnlocked.length}/${milestones.length}</p><div class="stage-progress"><span style="width:${progress}%"></span></div></div>`;
  els.stageRewardCard.innerHTML = markup;
  els.todayStageCard.innerHTML = markup;
}
function escapeHtml(value) { const element = document.createElement('div'); element.textContent = value; return element.innerHTML; }

function createTask(title, minutes, silent = false) { const task = { id: uid(), title: title.trim(), plannedMinutes: Number(minutes), plannedSeconds: Number(minutes) * 60, remainingSeconds: Number(minutes) * 60, focusedSeconds: 0, status: 'planned', nodes: [], manualProgress: 0, pauseCount: 0, pauseUsedSeconds: 0, date: dateKey(), createdAt: new Date().toISOString() }; state.tasks.push(task); addEvent('created', task); saveState(); render(); if (!silent) toast('已加入今天。现在，你只需要开始。'); return task; }
function startTask(task) { const engaged = focusTask(); if (engaged && engaged.id !== task.id) { toast(`“${engaged.title}”仍在专注或暂停中，请先处理它。`); return; } if (['completed','failed','abandoned'].includes(task.status)) return; task.status = 'in_progress'; task.startedAt ||= new Date().toISOString(); task.lastTickAt = Date.now(); addEvent(task.interruptedAt ? 'resumed_after_interrupt' : 'started', task); saveState(); render(); switchView('focus'); startTicker(); }
function pauseTask(task) { if (task.status !== 'in_progress') return; if (task.pauseCount >= PAUSE_LIMIT_COUNT || effectivePauseSeconds(task) >= PAUSE_LIMIT_SECONDS) { toast('这个任务今天的普通暂停额度已用完。'); return; } updateRunningTask(task); task.status = 'paused'; task.pausedAt = Date.now(); task.pauseCount += 1; addEvent('paused', task); saveState(); render(); startTicker(); }
function resumeTask(task) { if (task.status !== 'paused') return; const used = effectivePauseSeconds(task); task.pauseUsedSeconds = used; task.status = 'in_progress'; task.lastTickAt = Date.now(); addEvent('resumed', task); saveState(); render(); startTicker(); }
async function completeTask(task, madeUp = false) {
  if (!task || task.status === 'completed') return;
  if (task.nodes.length && taskProgress(task) < 100) { toast('请先完成全部节点。'); return; }
  if (!task.nodes.length && !madeUp) {
    const approved = await showConfirm('确认直接完成？', '该任务未拆分节点，确认后将按实际专注时长记录为完成。', '确认完成');
    if (!approved) return;
  }
  if (task.status === 'in_progress') updateRunningTask(task);
  if (task.status === 'paused') task.pauseUsedSeconds = effectivePauseSeconds(task);
  const completionSource = currentView;
  task.status = 'completed'; task.remainingSeconds = 0; task.manualProgress = 100; task.actualCompletedDate = dateKey();
  addEvent(madeUp ? 'made_up' : 'completed', task, { actualCompletedDate: task.actualCompletedDate }); saveState();
  if (shouldTrackDailyFulfillment(state.analytics.lastFulfillmentDate, task.actualCompletedDate) && pendingFulfillmentTrackingDate !== task.actualCompletedDate) {
    pendingFulfillmentTrackingDate = task.actualCompletedDate;
    void trackAnalyticsEvent('daily_fulfillment_achieved', {
      completion_mode: madeUp ? 'makeup' : 'standard',
      source_view: completionSource,
      has_nodes: task.nodes.length ? 'yes' : 'no',
      planned_duration_bucket: durationBucket(task.plannedMinutes),
      focus_duration_bucket: durationBucket(taskElapsed(task) / 60),
      app_version: 'v28'
    }).then(delivered => {
      if (delivered) {
        state.analytics.lastFulfillmentDate = task.actualCompletedDate;
        saveState();
      }
      pendingFulfillmentTrackingDate = null;
    });
  }
  render();
  if (currentView === 'focus') switchView('today');
  closeTimerFloat(); celebrate(task); openRewardDialog(task); checkStageRewards(); toast(madeUp ? '补做完成，原计划日期已更新为绿钩。' : '任务完成！你做到了，今天的努力算数。');
}
async function abandonTask(task) {
  if (!task || !task.startedAt || ['completed','failed','abandoned'].includes(task.status)) return;
  const approved = await showConfirm(`主动放弃“${task.title}”？`, '任务将从今日清单移除，但会作为“主动放弃”永久保留在日总结和异常记录中。', '确认放弃');
  if (!approved) return;
  if (task.status === 'in_progress') updateRunningTask(task);
  if (task.status === 'paused') task.pauseUsedSeconds = effectivePauseSeconds(task);
  task.status = 'abandoned';
  task.abandonedAt = new Date().toISOString();
  addEvent('abandoned', task, { reason: 'user_abandoned_after_start' });
  saveState();
  closeTimerFloat();
  stopTicker();
  render();
  if (currentView === 'focus') switchView('today');
  toast('已记录为主动放弃，可在日总结中复盘。');
}
function updateRunningTask(task) { if (task.status !== 'in_progress') return; const advanced = advanceRunningTimer(task, Date.now()); task.remainingSeconds = advanced.remainingSeconds; task.focusedSeconds = advanced.focusedSeconds; task.lastTickAt = advanced.lastTickAt; maybeWarn(task); if (task.remainingSeconds === 0) { task.status = 'failed'; task.failedAt = new Date().toISOString(); task.lastTickAt = null; addEvent('timed_out', task); closeTimerFloat(); if (currentView === 'focus') switchView('today'); toast(`“${task.title}”倒计时结束。你有一次申辩机会。`); } }
function updatePausedTask(task) { if (task.status !== 'paused') return; const base = task.pauseUsedSeconds || 0; const elapsed = Math.max(0, Math.floor((Date.now() - (task.pausedAt || Date.now())) / 1000)); if (base + elapsed >= PAUSE_LIMIT_SECONDS) { const resumeAt = (task.pausedAt || Date.now()) + Math.max(0, PAUSE_LIMIT_SECONDS - base) * 1000; task.pauseUsedSeconds = PAUSE_LIMIT_SECONDS; task.status = 'in_progress'; task.lastTickAt = resumeAt; addEvent('pause_limit_reached', task); updateRunningTask(task); toast('45 分钟普通暂停已用完，已自动恢复专注。'); } }
function tick() { if (!appInitialized) return; state.tasks.forEach(task => { if (task.status === 'paused') updatePausedTask(task); else updateRunningTask(task); }); saveState(); render(); if (!focusTask()) stopTicker(); }
function startTicker() { if (!timerId) timerId = setInterval(tick, 1000); }
function stopTicker() { clearInterval(timerId); timerId = null; }

function openNodes(task) { if (task.status !== 'planned') { toast('任务开始后不能修改节点结构。'); return; } editingNodesFor = task.id; els.nodeDialogTitle.textContent = `拆分：${task.title}`; renderNodeInputs(task.nodes); els.nodeDialog.showModal(); }
function renderNodeInputs(nodes) { const source = nodes.length ? nodes : [{ id: uid(), title: '', minutes: '', done: false }]; els.nodeList.innerHTML = source.map(node => `<div class="node-line" data-node-id="${node.id}"><input class="node-done" type="checkbox" ${node.done ? 'checked' : ''} aria-label="完成节点"><input class="node-title" maxlength="50" value="${escapeHtml(node.title)}" placeholder="节点内容" aria-label="节点内容"><input class="node-minutes" type="number" min="1" max="1440" value="${node.minutes || ''}" placeholder="分钟" aria-label="节点预计时长（分钟）"><button class="node-remove" type="button" aria-label="删除节点"><img src="node_modules/@ionic/core/dist/ionic/svg/close.svg" alt=""></button></div>`).join(''); els.addNodeButton.disabled = source.length >= MAX_NODES; updateNodeAllocation(); }
function updateNodeAllocation() { const task = state.tasks.find(item => item.id === editingNodesFor); if (!task) return; const lines = [...els.nodeList.querySelectorAll('.node-line')]; const assigned = lines.reduce((sum, line) => sum + (Number(line.querySelector('.node-minutes').value) || 0), 0); const remaining = task.plannedMinutes - assigned; els.nodeAllocation.className = `allocation-status ${remaining === 0 ? 'valid' : remaining < 0 ? 'invalid' : ''}`; els.nodeAllocation.innerHTML = `<span>已分配 ${assigned}/${task.plannedMinutes} 分钟</span>${remaining > 0 ? `<button type="button" data-fill-remaining="${remaining}">填充剩余 ${remaining} 分钟</button>` : `<strong>${remaining === 0 ? '时长已匹配' : `超出 ${Math.abs(remaining)} 分钟`}</strong>`}`; }
function generateRuleNodes(task) { const count = Math.min(3, task.plannedMinutes); const base = Math.floor(task.plannedMinutes / count); const remainder = task.plannedMinutes % count; const labels = count === 1 ? ['完成核心内容'] : count === 2 ? ['准备与理解', '练习与复盘'] : ['准备与明确目标', '完成核心学习', '练习并复盘']; return labels.map((title, index) => ({ id: uid(), title, minutes: base + (index < remainder ? 1 : 0), done: false })); }
function saveNodes() { const task = state.tasks.find(item => item.id === editingNodesFor); if (!task || task.status !== 'planned') return false; const lines = [...els.nodeList.querySelectorAll('.node-line')]; const nodes = lines.map(line => ({ id: line.dataset.nodeId, title: line.querySelector('.node-title').value.trim(), minutes: Number(line.querySelector('.node-minutes').value) || 0, done: false })).filter(node => node.title); if (!nodeDurationValid(nodes, task.plannedMinutes)) { toast(`节点时长之和必须等于 ${task.plannedMinutes} 分钟，且最多 10 个节点。`); return false; } task.nodes = nodes; if (!nodes.length) task.manualProgress = 0; addEvent('nodes_updated', task); saveState(); render(); toast(nodes.length ? '节点已保存，完成一格就前进一步。' : '已清空节点，可直接完成或后续再拆分。'); return true; }

function maybeWarn(task) {
  const threshold = warningMinutes(task);
  if (task.warned || task.remainingSeconds > threshold * 60 || taskProgress(task) >= 60) return;
  task.warned = true; addEvent('warning_shown', task); saveState();
  els.warningTitle.textContent = `“${task.title}”进入最后 ${threshold} 分钟`;
  els.warningCopy.textContent = `${WARNING_COPY[state.settings.promptStyle]}${state.settings.guiltCopy ? ' 这是今天亲手写下的承诺，请别轻易让它落空。' : ''}`;
  if (!els.warningDialog.open) els.warningDialog.showModal();
}

function celebrate() {
  if (state.settings.reduceMotion) return;
  els.celebration.hidden = false;
  clearTimeout(celebrate.timer);
  celebrate.timer = setTimeout(() => { els.celebration.hidden = true; }, 1200);
}

function rewardBatch() {
  const shuffled = [...state.rewards].sort(() => Math.random() - .5);
  return shuffled.slice(0, Math.min(3, shuffled.length));
}
function showRewardBatch() {
  selectedReward = null; els.claimReward.disabled = true;
  els.rewardOptions.innerHTML = rewardBatch().map(item => `<button type="button" data-reward-id="${item.id}">${escapeHtml(item.content)}</button>`).join('') || '<p class="muted">奖励池为空，请先在“奖惩”中添加奖励。</p>';
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

function recordReminderDiagnostic(result, error = null) {
  state.reminderDiagnostics.lastCheckedAt = new Date().toISOString();
  state.reminderDiagnostics.lastResult = result;
  state.reminderDiagnostics.lastError = error ? String(error).slice(0, 160) : null;
  saveState();
  renderPreferences();
}
async function showPlanNotification(title, body, tag) {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker 不可用');
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, { body, icon: './icon.svg', tag, data: { view: 'today' } });
}
async function checkReminderDelivery(source = 'foreground') {
  const today = dateKey();
  if (todayTasks().length) { recordReminderDiagnostic('skipped_tasks'); return false; }
  if (isFreeDay(today)) { recordReminderDiagnostic('skipped_free_day'); return false; }
  if (state.reminderDeliveries.some(item => item.date === today)) { recordReminderDiagnostic('already_delivered'); return false; }
  const now = new Date(); const [hour, minute] = state.settings.reminderTime.split(':').map(Number); const reminderAt = new Date(now); reminderAt.setHours(hour, minute, 0, 0);
  if (now < reminderAt) { recordReminderDiagnostic('waiting'); return false; }
  if (!('Notification' in window)) { recordReminderDiagnostic('unsupported'); return false; }
  if (Notification.permission !== 'granted') { recordReminderDiagnostic('permission_denied'); return false; }
  if (!('serviceWorker' in navigator)) { recordReminderDiagnostic('service_worker_unavailable'); return false; }
  try {
    await showPlanNotification('该安排今天的任务了', '打开“今日兑现”，为今天发布最重要的学习任务。', `plan-${today}`);
    const deliveredAt = new Date().toISOString();
    state.reminderDeliveries.push({ date: today, deliveredAt, source });
    state.reminderDiagnostics.lastDeliveredAt = deliveredAt;
    recordReminderDiagnostic('delivered');
    return true;
  } catch (error) {
    recordReminderDiagnostic('failed', error?.message || error);
    return false;
  }
}
function scheduleReminderCheck() {
  clearTimeout(reminderTimerId);
  if (!appInitialized) return;
  const next = nextReminderTime(new Date(), state.settings.reminderTime);
  state.reminderDiagnostics.nextScheduledAt = next.toISOString();
  saveState();
  renderPreferences();
  reminderTimerId = setTimeout(async () => {
    await checkReminderDelivery('scheduled');
    scheduleReminderCheck();
  }, Math.max(0, next.getTime() - Date.now()));
}
async function testNotificationDelivery() {
  if (!('Notification' in window) || Notification.permission !== 'granted') { recordReminderDiagnostic('permission_denied'); toast('请先授权通知。'); return; }
  try {
    await showPlanNotification('今日兑现 · 测试通知', '如果你看到这条消息，浏览器与系统通知链路正常。', `test-${Date.now()}`);
    recordReminderDiagnostic('test_delivered');
    toast('测试通知已发送，请检查系统通知栏。');
  } catch (error) {
    recordReminderDiagnostic('failed', error?.message || error);
    toast('测试通知发送失败，原因已记录在设置页。');
  }
}
async function configureBackgroundReminder() {
  state.reminderDiagnostics.backgroundMode = 'foreground_only';
  state.reminderDiagnostics.backgroundError = null;
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (!registration?.periodicSync) throw new Error('当前浏览器或安装方式不支持');
    const tags = await registration.periodicSync.getTags();
    if (!tags.includes('plan-reminder-fallback')) await registration.periodicSync.register('plan-reminder-fallback', { minInterval: 12 * 60 * 60 * 1000 });
    state.reminderDiagnostics.backgroundMode = 'periodic_sync';
  } catch (error) {
    state.reminderDiagnostics.backgroundError = error?.message || String(error);
  }
  saveState();
  renderPreferences();
}
async function requestNotificationAccess() {
  if (!('Notification' in window)) { renderPreferences(); return; }
  try {
    const permission = await Notification.requestPermission();
    renderPreferences();
    toast(permission === 'granted' ? '通知已授权，将按设置时间尝试提醒。' : '未获得通知权限，可稍后在浏览器设置中调整。');
    if (permission === 'granted') { await checkReminderDelivery('permission_granted'); scheduleReminderCheck(); configureBackgroundReminder(); }
  } catch {
    toast('浏览器未能完成通知授权。');
  }
}
function showPenaltyRecord(record) { if (!record || record.status !== 'pending' || (record.snoozedUntil && Date.now() < record.snoozedUntil) || els.penaltyDialog.open) return; pendingPenaltyId = record.id; els.penaltyTitle.textContent = record.trigger === 'task_failure' ? '任务失败约束' : '未按时创建任务'; els.penaltyTrigger.textContent = record.taskTitle ? `对应任务：${record.taskTitle}` : '提醒成功送达后 30 分钟仍未创建任务'; els.penaltyContent.textContent = record.content; els.penaltyDialog.showModal(); }
function triggerPenalty(trigger, task = null) { if (!state.punishments.length) return null; if (task && state.penaltyRecords.some(item => item.trigger === trigger && item.taskId === task.id)) return null; const punishment = randomItem(state.punishments); const record = { id: uid(), date: dateKey(), trigger, taskId: task?.id || null, taskTitle: task?.title || '', punishmentId: punishment.id, content: punishment.content, status: 'pending', triggeredAt: new Date().toISOString() }; state.penaltyRecords.push(record); saveState(); showPenaltyRecord(record); return record; }
function checkNoPlanPenalty() { const delivery = state.reminderDeliveries.find(item => item.date === dateKey()); if (!delivery || Date.now() < new Date(delivery.deliveredAt).getTime() + 30 * 60000 || todayTasks().length || isFreeDay(dateKey())) return; let record = state.penaltyRecords.find(item => item.date === dateKey() && item.trigger === 'no_plan'); if (!record) record = triggerPenalty('no_plan'); showPenaltyRecord(record); }

function openAppeal(task) { if (task.appealUsed) return; pendingAppealTaskId = task.id; els.appealForm.reset(); els.appealResult.textContent = ''; els.appealResult.className = 'appeal-result'; els.appealDialog.showModal(); }
function waiveAppeal(task) { task.appealUsed = true; task.appealReason = '用户主动放弃申辩'; addEvent('appeal_waived', task); saveState(); triggerPenalty('task_failure', task); render(); toast('已放弃申辩，任务保持失败并触发一次安全约束。'); }
function interruptTask(task, reason) { if (!task || task.status !== 'in_progress') return; updateRunningTask(task); task.status = 'interrupted'; task.interruptedAt = new Date().toISOString(); task.interruptReason = reason; addEvent('special_interrupted', task, { reason }); saveState(); closeTimerFloat(); render(); switchView('today'); toast('特殊中断已记录，任务进度已保留。'); }

function rolloverInterruptedTasks() { state.tasks.filter(task => task.status === 'interrupted' && task.date < dateKey()).forEach(task => { task.status = 'makeup'; addEvent('interruption_became_makeup', task); }); }
function openTaskEditor(task = null) { if (task && task.status !== 'planned') { toast('任务开始后不能编辑。'); return; } editingTaskId = task?.id || null; durationUnit = 'minutes'; document.querySelectorAll('[data-duration-unit]').forEach(button => button.classList.toggle('active', button.dataset.durationUnit === durationUnit)); els.taskEditorEyebrow.textContent = task ? '编辑任务' : '新增任务'; els.taskEditorHeading.textContent = task ? '调整尚未开始的计划' : '给今天一个清晰目标'; els.saveTaskButton.textContent = task ? '保存修改' : '加入今天'; els.title.value = task?.title || ''; els.duration.value = task?.plannedMinutes || ''; els.formMessage.textContent = ''; els.durationHint.textContent = `最短 1 分钟；按当前计划，今天还可安排 ${availableTodayMinutes(task?.id)} 分钟。`; switchView('task-editor'); setTimeout(() => els.title.focus(), 80); }
function closeTaskEditor() { editingTaskId = null; els.taskForm.reset(); els.formMessage.textContent = ''; switchView('today'); }
function changeDurationUnit(unit) { if (unit === durationUnit) return; const currentMinutes = durationToMinutes(els.duration.value, durationUnit); durationUnit = unit; document.querySelectorAll('[data-duration-unit]').forEach(button => { const active = button.dataset.durationUnit === unit; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); }); els.duration.min = unit === 'hours' ? '0.02' : '1'; els.duration.max = unit === 'hours' ? '24' : '1440'; els.duration.step = unit === 'hours' ? '0.01' : '1'; els.duration.placeholder = unit === 'hours' ? '例如：1.5' : '例如：45'; if (currentMinutes) els.duration.value = unit === 'hours' ? Number((currentMinutes / 60).toFixed(2)) : currentMinutes; }
async function saveTaskFromForm() { const title = els.title.value.trim(); const minutes = durationToMinutes(els.duration.value, durationUnit); const task = state.tasks.find(item => item.id === editingTaskId); els.formMessage.textContent = ''; if (!title) { els.formMessage.textContent = '请写下要学习的内容。'; return; } if (!Number.isInteger(minutes) || minutes < 1) { els.formMessage.textContent = '预计时长最短为 1 分钟。'; return; } if (!isTimeAllowed(minutes, task?.id)) { els.formMessage.textContent = `今天最多还可安排 ${availableTodayMinutes(task?.id)} 分钟，请缩短时长。`; return; } if (!task) { createTask(title, minutes); closeTaskEditor(); return; } if (task.nodes.length && task.nodes.reduce((sum, node) => sum + node.minutes, 0) !== minutes) { const approved = await showConfirm('节点时长需要重新分配', '修改总时长后，现有节点时长将不再匹配。确认后会清空节点，请重新拆分。', '继续修改'); if (!approved) return; task.nodes = []; task.manualProgress = 0; } task.title = title; task.plannedMinutes = minutes; task.plannedSeconds = minutes * 60; task.remainingSeconds = minutes * 60; task.warned = false; addEvent('edited', task); saveState(); render(); closeTaskEditor(); toast('任务已更新。'); }
function shuffleSuggestionBatch() { currentSuggestions = pickSuggestionBatch(SUGGESTION_POOL, currentSuggestions); renderSuggestions(visibleTasks()); toast('已换一批建议任务。'); }
function publishSuggestion(index) { const item = currentSuggestions[index]; if (!item) return; if (!isTimeAllowed(item.minutes)) { toast(`今天最多还可安排 ${availableTodayMinutes()} 分钟，无法发布这条建议。`); return; } createTask(item.title, item.minutes); }
function publishAllSuggestions() { const total = currentSuggestions.reduce((sum, item) => sum + item.minutes, 0); if (!isTimeAllowed(total)) { toast(`三条建议共 ${total} 分钟，今天最多还可安排 ${availableTodayMinutes()} 分钟。`); return; } currentSuggestions.forEach(item => createTask(item.title, item.minutes, true)); toast('3 个建议任务已全部发布。'); }
function showFallbackConfirm(title, message, acceptLabel) { els.confirmTitle.textContent = title; els.confirmMessage.textContent = message; els.confirmAccept.textContent = acceptLabel; els.confirmDialog.showModal(); return new Promise(resolve => { confirmResolver = resolve; }); }
async function showConfirm(title, message, acceptLabel = '确认') { return showFallbackConfirm(title, message, acceptLabel); }
async function openTimerFloat() { const task = focusTask(); if (!task) return; if ('documentPictureInPicture' in window) { try { pipWindow = await window.documentPictureInPicture.requestWindow({ width: 180, height: 90 }); pipWindow.document.body.innerHTML = ''; const style = pipWindow.document.createElement('style'); style.textContent = 'body{margin:0;display:grid;place-items:center;height:100vh;background:#163d34;color:#fff;font:800 38px/1 ui-rounded,system-ui;font-variant-numeric:tabular-nums;letter-spacing:-.06em}'; pipWindow.document.head.append(style); pipTimeElement = pipWindow.document.createElement('time'); pipTimeElement.textContent = formatTime(task.remainingSeconds); pipWindow.document.body.append(pipTimeElement); pipWindow.addEventListener('pagehide', () => { pipWindow = null; pipTimeElement = null; }); toast('倒计时浮窗已开启。'); return; } catch { /* 用户取消或浏览器拒绝时继续尝试通知 */ } } await showTimerNotification(task); }
async function showTimerNotification(task) { if (!('Notification' in window) || !('serviceWorker' in navigator)) { toast('当前浏览器不支持浮窗或后台通知。'); return; } try { let permission = Notification.permission; if (permission === 'default') permission = await Notification.requestPermission(); if (permission !== 'granted') { toast('未获得通知权限，倒计时仍会在后台继续。'); return; } const endAt = new Date(Date.now() + task.remainingSeconds * 1000); const registration = await navigator.serviceWorker.ready; await registration.showNotification(formatTime(task.remainingSeconds), { body: `预计 ${endAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 结束，点击返回专注。`, icon: './icon.svg', tag: 'focus-timer', requireInteraction: true, data: { view: 'focus' } }); toast('已在通知栏显示预计结束时间。'); } catch { toast('系统未能显示通知，倒计时仍会继续。'); } }
function closeTimerFloat() { if (pipWindow && !pipWindow.closed) pipWindow.close(); pipWindow = null; pipTimeElement = null; }

els.taskForm.addEventListener('submit', event => { event.preventDefault(); saveTaskFromForm(); });
els.openCreateTask.addEventListener('click', () => openTaskEditor());
document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => switchView(button.dataset.target)));
els.closeTaskEditor.addEventListener('click', closeTaskEditor);
els.cancelTaskEditor.addEventListener('click', closeTaskEditor);
document.querySelectorAll('[data-duration-unit]').forEach(button => button.addEventListener('click', () => changeDurationUnit(button.dataset.durationUnit)));
els.suggestionList.addEventListener('click', event => { const button = event.target.closest('[data-publish-suggestion]'); if (button) publishSuggestion(Number(button.dataset.publishSuggestion)); });
els.shuffleSuggestions.addEventListener('click', shuffleSuggestionBatch);
els.publishAllSuggestions.addEventListener('click', publishAllSuggestions);
els.taskList.addEventListener('click', event => { const button = event.target.closest('button[data-action]'); if (!button) return; if (button.dataset.action === 'create') { openTaskEditor(); return; } const card = button.closest('[data-task-id]'); const task = state.tasks.find(item => item.id === card?.dataset.taskId); if (!task) return; const action = button.dataset.action; if (action === 'start') startTask(task); if (action === 'focus') switchView('focus'); if (action === 'complete') completeTask(task); if (action === 'nodes') openNodes(task); if (action === 'appeal') openAppeal(task); if (action === 'waive-appeal') waiveAppeal(task); if (action === 'edit') openTaskEditor(task); if (action === 'delete') deleteTask(task); if (action === 'abandon') abandonTask(task); });
els.pauseButton.addEventListener('click', () => { const task = focusTask(); if (!task) return; task.status === 'paused' ? resumeTask(task) : pauseTask(task); });
els.finishButton.addEventListener('click', () => completeTask(focusTask()));
els.abandonFocusButton.addEventListener('click', () => abandonTask(focusTask()));
els.interruptButton.addEventListener('click', () => { const task = focusTask(); if (!task) return; if (task.status === 'paused') resumeTask(task); els.interruptForm.reset(); els.interruptDialog.showModal(); });
els.interruptClose.addEventListener('click', () => els.interruptDialog.close());
els.interruptForm.addEventListener('submit', event => { event.preventDefault(); const reason = els.interruptReason.value.trim(); if (!reason) return; interruptTask(activeTask(), reason); els.interruptDialog.close(); });
els.focusNodeList.addEventListener('change', event => { const task = focusTask(); if (!task) return; const nodeInput = event.target.closest('[data-focus-node]'); if (!nodeInput) return; const node = task.nodes.find(item => item.id === nodeInput.dataset.focusNode); if (!node) return; const wasDone = node.done; node.done = nodeInput.checked; addEvent('node_toggled', task, { nodeId: node.id, done: node.done }); saveState(); render(); if (!wasDone && node.done) toast(randomItem(NODE_ENCOURAGEMENT)); });
els.miniFocusBar.addEventListener('click', () => switchView('focus'));
els.leaveFocus.addEventListener('click', () => switchView('today'));
els.floatTimerButton.addEventListener('click', openTimerFloat);
els.todayButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
document.querySelector('#view-calendar').addEventListener('click', event => {
  const makeupButton = event.target.closest('[data-makeup-task]');
  if (makeupButton) { const task = state.tasks.find(item => item.id === makeupButton.dataset.makeupTask); if (task) completeTask(task, true); return; }
  const cancelFreeDay = event.target.closest('[data-cancel-free-day]');
  if (cancelFreeDay) { state.freeDays = state.freeDays.filter(key => key !== cancelFreeDay.dataset.cancelFreeDay); state.events.push({ id: uid(), type: 'free_day_cancelled', at: new Date().toISOString(), date: cancelFreeDay.dataset.cancelFreeDay }); saveState(); render(); toast('未来自由日已取消，卡片已返还。'); return; }
  const dateButton = event.target.closest('[data-date]');
  if (dateButton && !dateButton.disabled) { selectedCalendarDate = dateButton.dataset.date; els.freeDayDate.value = selectedCalendarDate; renderCalendar(); }
});
document.querySelector('#view-calendar').addEventListener('change', event => { const nodeInput = event.target.closest('[data-makeup-node]'); const range = event.target.closest('[data-makeup-progress]'); const control = nodeInput || range; if (!control) return; const task = state.tasks.find(item => item.id === control.dataset.taskId); if (!task) return; if (nodeInput) { const node = task.nodes.find(item => item.id === nodeInput.dataset.makeupNode); if (node) node.done = nodeInput.checked; } else task.manualProgress = Number(range.value); addEvent('makeup_progress_updated', task, { progress: taskProgress(task) }); saveState(); render(); });
els.previousMonth.addEventListener('click', () => { calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1); renderCalendar(); });
els.nextMonth.addEventListener('click', () => { calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1); renderCalendar(); });
els.useFreeDay.addEventListener('click', () => {
  const key = els.freeDayDate.value;
  if (!key) { toast('请先选择自由日日期。'); return; }
  if (key < dateKey()) { toast('自由日只能用于今天或未来日期。'); return; }
  if (isFreeDay(key)) { toast('这一天已经是自由日。'); return; }
  if (tasksForDate(key).length) { toast('该日期已有任务，请选择没有任务的一天。'); return; }
  if (availableFreeDayCards() < 1) { toast('自由日卡不足，每 7 个绿钩日可解锁 1 张。'); return; }
  state.freeDays.push(key); state.events.push({ id: uid(), type: 'free_day_used', at: new Date().toISOString(), date: key }); selectedCalendarDate = key; saveState(); render(); toast('自由日已启用，这一天无需创建任务。');
});
els.promptStyle.addEventListener('change', () => { state.settings.promptStyle = els.promptStyle.value; saveState(); });
els.guiltCopy.addEventListener('change', () => { state.settings.guiltCopy = els.guiltCopy.checked; saveState(); });
els.reduceMotion.addEventListener('change', () => { state.settings.reduceMotion = els.reduceMotion.checked; saveState(); renderPreferences(); });
els.usageAnalytics.addEventListener('change', () => {
  state.settings.usageAnalytics = els.usageAnalytics.checked;
  saveState();
  configureAnalytics(state.settings.usageAnalytics);
  if (state.settings.usageAnalytics) {
    toast('匿名使用统计已开启。');
  } else {
    const analyticsWasLoaded = Boolean(document.getElementById('LA_COLLECT'));
    toast('匿名使用统计已关闭，后续打开时不会加载统计服务。');
    if (analyticsWasLoaded) setTimeout(() => window.location.reload(), 500);
  }
});
els.reminderTime.addEventListener('change', () => { state.settings.reminderTime = els.reminderTime.value || '10:00'; saveState(); checkReminderDelivery('setting_changed'); scheduleReminderCheck(); toast(`每日提醒时间已设为 ${state.settings.reminderTime}。`); });
els.notificationPermission.addEventListener('click', requestNotificationAccess);
els.testNotification.addEventListener('click', testNotificationDelivery);
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
els.appealForm.addEventListener('submit', event => { event.preventDefault(); const task = state.tasks.find(item => item.id === pendingAppealTaskId); const reason = els.appealReason.value.trim(); if (!task || !reason || !els.appealHonesty.checked || task.appealUsed) return; const result = reviewAppeal(reason); task.appealUsed = true; task.appealReason = reason; task.appealReview = { mode: 'local_rules', ...result, reviewedAt: new Date().toISOString() }; els.appealResult.textContent = result.message; els.appealResult.classList.add(result.approved ? 'approved' : 'rejected'); if (result.approved) { task.status = 'makeup'; addEvent('appealed', task, { reason, reviewMode: 'local_rules' }); toast('审核通过，已转为黄色待补。'); setTimeout(() => els.appealDialog.close(), 700); } else { addEvent('appeal_rejected', task, { reason, reviewMode: 'local_rules' }); triggerPenalty('task_failure', task); toast('审核未通过，任务保持失败。'); } saveState(); render(); });
els.addNodeButton.addEventListener('click', () => { const nodes = [...els.nodeList.querySelectorAll('.node-line')]; if (nodes.length >= MAX_NODES) return; const placeholder = document.createElement('div'); placeholder.className = 'node-line'; placeholder.dataset.nodeId = uid(); placeholder.innerHTML = '<input class="node-done" type="checkbox" aria-label="完成节点"><input class="node-title" maxlength="50" placeholder="节点内容" aria-label="节点内容"><input class="node-minutes" type="number" min="1" max="1440" placeholder="分钟" aria-label="节点预计时长（分钟）"><button class="node-remove" type="button" aria-label="删除节点"><img src="node_modules/@ionic/core/dist/ionic/svg/close.svg" alt=""></button>'; els.nodeList.append(placeholder); els.addNodeButton.disabled = nodes.length + 1 >= MAX_NODES; updateNodeAllocation(); placeholder.querySelector('.node-title').focus(); });
els.smartSplitButton.addEventListener('click', () => { const task = state.tasks.find(item => item.id === editingNodesFor); if (!task) return; renderNodeInputs(generateRuleNodes(task)); toast('已使用本地规则拆分，可继续编辑后确认。'); });
els.nodeList.addEventListener('input', updateNodeAllocation);
els.nodeList.addEventListener('click', event => { const fill = event.target.closest('[data-fill-remaining]'); if (fill) { const last = [...els.nodeList.querySelectorAll('.node-minutes')].at(-1); if (last) last.value = (Number(last.value) || 0) + Number(fill.dataset.fillRemaining); updateNodeAllocation(); return; } if (!event.target.closest('.node-remove')) return; event.target.closest('.node-line').remove(); els.addNodeButton.disabled = els.nodeList.querySelectorAll('.node-line').length >= MAX_NODES; updateNodeAllocation(); });
els.nodeForm.addEventListener('submit', event => { if (event.submitter?.value === 'cancel') return; event.preventDefault(); if (saveNodes()) els.nodeDialog.close(); });
els.confirmCancel.addEventListener('click', () => { els.confirmDialog.close(); confirmResolver?.(false); confirmResolver = null; });
els.confirmAccept.addEventListener('click', () => { els.confirmDialog.close(); confirmResolver?.(true); confirmResolver = null; });
els.confirmDialog.addEventListener('cancel', event => { event.preventDefault(); els.confirmDialog.close(); confirmResolver?.(false); confirmResolver = null; });

async function deleteTask(task) { if (task.status !== 'planned') return; const approved = await showConfirm(`删除“${task.title}”？`, '删除后该任务和未开始记录将从今天移除。', '删除任务'); if (!approved) return; state.tasks = state.tasks.filter(item => item.id !== task.id); state.events = state.events.filter(event => event.taskId !== task.id); saveState(); render(); toast('任务已删除。'); }

if ('serviceWorker' in navigator) {
  let refreshingForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshingForUpdate) return;
    refreshingForUpdate = true;
    window.location.reload();
  });
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'OPEN_VIEW') switchView(event.data.view || 'today');
    if (event.data?.type === 'CHECK_REMINDER') checkReminderDelivery('periodic_sync_client');
  });
  navigator.serviceWorker.register('./sw.js').then(registration => registration.update()).catch(() => {});
}
async function initializeApp() {
  document.body.classList.add('app-loading');
  const restored = await loadPersistedState();
  state = normalizeState(restored.state);
  appInitialized = true;
  rolloverInterruptedTasks();
  ensurePreviousMonthReport();
  state.tasks.forEach(task => { if (task.status === 'paused') updatePausedTask(task); else updateRunningTask(task); });
  saveState();
  render();
  switchView(currentView);
  document.body.classList.remove('app-loading');
  configureAnalytics(state.settings.usageAnalytics);
  if (focusTask()) startTicker();
  if (restored.recovered) setTimeout(() => toast('已从本地安全备份恢复全部数据。'), 150);
  requestPersistentStorage();
  scheduleReminderCheck();
  configureBackgroundReminder();
}
initializeApp();
document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); checkReminderDelivery('visibility_resume'); scheduleReminderCheck(); } });
window.addEventListener('pageshow', () => { tick(); checkReminderDelivery('pageshow'); scheduleReminderCheck(); });
window.addEventListener('pagehide', () => { saveState(); flushPersistedState(); });
setTimeout(() => { if (appInitialized) { checkReminderDelivery('startup'); checkNoPlanPenalty(); } }, 600);
setInterval(() => { if (!appInitialized) return; rolloverInterruptedTasks(); ensurePreviousMonthReport(); checkNoPlanPenalty(); saveState(); render(); }, 60000);
