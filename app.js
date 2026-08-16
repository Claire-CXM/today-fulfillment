const STORAGE_KEY = 'today-fulfillment-state-v1';
const MAX_NODES = 10;
const PAUSE_LIMIT_SECONDS = 15 * 60;
const PAUSE_LIMIT_COUNT = 3;

const $ = selector => document.querySelector(selector);
const els = { taskList: $('#task-list'), taskForm: $('#task-form'), title: $('#task-title'), minutes: $('#task-minutes'), formMessage: $('#form-message'), taskCount: $('#task-count'), dailyScore: $('#daily-score'), dailyNote: $('#daily-note'), todayButton: $('#today-button'), focusPanel: $('#focus-panel'), focusTitle: $('#focus-title'), timer: $('#timer'), pauseButton: $('#pause-button'), finishButton: $('#finish-button'), pauseHint: $('#pause-hint'), focusTaskButton: $('#focus-task-button'), week: $('#week-calendar'), summaryFocus: $('#summary-focus'), summaryPauses: $('#summary-pauses'), summaryProgress: $('#summary-progress'), abandonNote: $('#abandon-note'), toast: $('#toast'), nodeDialog: $('#node-dialog'), nodeDialogTitle: $('#node-dialog-title'), nodeForm: $('#node-form'), nodeList: $('#node-list'), addNodeButton: $('#add-node-button') };

let state = loadState();
let editingNodesFor = null;
let timerId = null;

function dateKey(date = new Date()) { const offset = date.getTimezoneOffset() * 60000; return new Date(date - offset).toISOString().slice(0, 10); }
function localDate(date = new Date()) { return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(date); }
function uid() { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`; }
function freshState() { return { tasks: [], events: [] }; }
function loadState() { try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)); return parsed && Array.isArray(parsed.tasks) ? parsed : freshState(); } catch { return freshState(); } }
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function todayTasks() { return state.tasks.filter(task => task.date === dateKey()); }
function visibleTasks() { return todayTasks().filter(task => task.status !== 'abandoned'); }
function activeTask() { return state.tasks.find(task => task.status === 'in_progress'); }
function taskProgress(task) { if (task.nodes.length) return Math.round(task.nodes.filter(node => node.done).length / task.nodes.length * 100); return task.manualProgress || 0; }
function taskElapsed(task) { return Math.max(0, task.plannedSeconds - task.remainingSeconds); }
function formatTime(seconds) { const safe = Math.max(0, Math.round(seconds)); return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`; }
function taskStatus(task) { return ({ planned: '待开始', in_progress: '专注中', paused: '已暂停', completed: '已完成', failed: '已结束', abandoned: '已放弃' })[task.status] || '待开始'; }
function toast(message) { els.toast.textContent = message; els.toast.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => els.toast.classList.remove('show'), 3200); }
function isTimeAllowed(minutes) { const now = new Date(); const deadline = new Date(now); deadline.setHours(24, 0, 0, 0); return now.getTime() + Number(minutes) * 60000 <= deadline.getTime(); }
function addEvent(type, task, details = {}) { state.events.push({ id: uid(), type, taskId: task.id, taskTitle: task.title, at: new Date().toISOString(), date: task.date, ...details }); }

function render() {
  const tasks = visibleTasks();
  const completed = tasks.filter(task => task.status === 'completed').length;
  els.todayButton.textContent = localDate();
  els.taskCount.textContent = `${tasks.length} 个任务`;
  els.dailyScore.textContent = `${completed}/${tasks.length}`;
  els.dailyNote.textContent = tasks.length ? (completed === tasks.length ? '今天的承诺，已经全部兑现。' : '从最重要的一件开始。') : '先写下一件真正要完成的事。';
  renderTaskList(tasks);
  renderFocus();
  renderCalendar();
  renderSummary(tasks);
}

function renderTaskList(tasks) {
  if (!tasks.length) { els.taskList.innerHTML = `<div class="empty-slots">${[1,2,3].map(index => `<div class="empty-slot"><b>${index}</b><span>为今天留一个任务位</span></div>`).join('')}</div>`; return; }
  els.taskList.innerHTML = tasks.map(task => {
    const progress = taskProgress(task); const nodes = task.nodes.slice(0, 4).map(node => `<span class="node-pill ${node.done ? 'done' : ''}">${escapeHtml(node.title || '未命名节点')}</span>`).join('');
    const beginLabel = task.status === 'paused' ? '继续专注' : '开始专注';
    const disabled = task.status === 'completed' || task.status === 'failed';
    return `<article class="task-card ${task.status}" data-task-id="${task.id}"><div class="task-row"><div><h3 class="task-title">${escapeHtml(task.title)}</h3><p class="task-meta">预计 ${task.plannedMinutes} 分钟 · 剩余 ${formatTime(task.remainingSeconds)}</p></div><span class="status ${task.status}">${taskStatus(task)}</span></div><div class="task-progress"><span style="width:${progress}%"></span></div><div class="progress-row"><span>${task.nodes.length ? `${task.nodes.filter(node => node.done).length}/${task.nodes.length} 节点` : '手动进度'}</span><strong>${progress}%</strong></div>${task.nodes.length ? `<div class="node-preview">${nodes}${task.nodes.length > 4 ? `<span class="node-pill">+${task.nodes.length - 4}</span>` : ''}</div>` : ''}<div class="task-actions">${!disabled ? `<button class="button primary" data-action="start" type="button">${beginLabel}</button><button class="button outline" data-action="nodes" type="button">${task.nodes.length ? '编辑节点' : '拆分节点'}</button><button class="button quiet" data-action="complete" type="button">直接完成</button>` : ''}<button class="text-button" data-action="edit" type="button">编辑</button><button class="text-button delete-button" data-action="delete" type="button">删除</button></div></article>`;
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
  const key = dateKey(day); const tasks = state.tasks.filter(task => task.date === key); const done = tasks.filter(task => task.status === 'completed').length;
  if (day > new Date() && key !== dateKey()) return 'future';
  if (!tasks.length || done === 0) return 'red';
  return done === tasks.length ? 'green' : 'yellow';
}
function renderCalendar() {
  const today = new Date(); const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  els.week.innerHTML = Array.from({ length: 7 }, (_, index) => { const day = new Date(monday); day.setDate(monday.getDate() + index); const stateName = calendarState(day); const isToday = dateKey(day) === dateKey(); return `<div class="day ${stateName} ${isToday ? 'today' : ''}"><span>${'一二三四五六日'[index]}</span><strong>${day.getDate()}</strong><i class="day-status ${stateName}"></i></div>`; }).join('');
}
function renderSummary(tasks) {
  const focusSeconds = tasks.reduce((sum, task) => sum + taskElapsed(task), 0); const pauses = tasks.reduce((sum, task) => sum + task.pauseCount, 0); const average = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + taskProgress(task), 0) / tasks.length) : 0; const abandoned = todayTasks().filter(task => task.status === 'abandoned').length;
  els.summaryFocus.textContent = `${Math.floor(focusSeconds / 60)} 分钟`; els.summaryPauses.textContent = `${pauses} 次`; els.summaryProgress.textContent = `${average}%`; els.abandonNote.textContent = abandoned ? `另有 ${abandoned} 个任务以“主动放弃”保留在今日记录中。` : '完成不是完美，而是把承诺落到实处。';
}
function escapeHtml(value) { const element = document.createElement('div'); element.textContent = value; return element.innerHTML; }

function createTask(title, minutes) { const task = { id: uid(), title: title.trim(), plannedMinutes: Number(minutes), plannedSeconds: Number(minutes) * 60, remainingSeconds: Number(minutes) * 60, status: 'planned', nodes: [], manualProgress: 0, pauseCount: 0, pauseUsedSeconds: 0, date: dateKey(), createdAt: new Date().toISOString() }; state.tasks.push(task); addEvent('created', task); saveState(); render(); toast('已加入今天。现在，你只需要开始。'); }
function startTask(task) { const running = activeTask(); if (running && running.id !== task.id) { toast(`“${running.title}”正在专注中，请先暂停或完成它。`); return; } if (task.status === 'completed' || task.status === 'failed') return; task.status = 'in_progress'; task.startedAt ||= new Date().toISOString(); task.lastTickAt = Date.now(); addEvent('started', task); saveState(); render(); startTicker(); }
function pauseTask(task) { if (task.status !== 'in_progress') return; if (task.pauseCount >= PAUSE_LIMIT_COUNT || task.pauseUsedSeconds >= PAUSE_LIMIT_SECONDS) { toast('这个任务今天的普通暂停额度已用完，请继续专注或完成任务。'); return; } updateRunningTask(task); task.status = 'paused'; task.pausedAt = Date.now(); task.pauseCount += 1; addEvent('paused', task); saveState(); render(); startTicker(); }
function resumeTask(task) { if (task.status !== 'paused') return; if (task.pauseUsedSeconds >= PAUSE_LIMIT_SECONDS) { toast('普通暂停累计已达 15 分钟，请直接继续专注。'); task.status = 'in_progress'; task.lastTickAt = Date.now(); saveState(); render(); startTicker(); return; } const now = Date.now(); task.pauseUsedSeconds = Math.min(PAUSE_LIMIT_SECONDS, task.pauseUsedSeconds + Math.floor((now - task.pausedAt) / 1000)); task.status = 'in_progress'; task.lastTickAt = now; addEvent('resumed', task); saveState(); render(); startTicker(); }
function completeTask(task) { if (!task || task.status === 'completed') return; if (task.status === 'in_progress') updateRunningTask(task); task.status = 'completed'; task.remainingSeconds = 0; task.manualProgress = 100; task.nodes.forEach(node => { node.done = true; }); addEvent('completed', task); saveState(); render(); toast('任务完成！你做到了，今天的努力算数。'); }
function updateRunningTask(task) { if (task.status !== 'in_progress') return; const now = Date.now(); const delta = Math.max(0, Math.floor((now - (task.lastTickAt || now)) / 1000)); task.remainingSeconds = Math.max(0, task.remainingSeconds - delta); task.lastTickAt = now; if (task.remainingSeconds === 0) { task.status = 'failed'; addEvent('timed_out', task); toast(`“${task.title}”倒计时结束，已记入今日记录。`); } }
function updatePausedTask(task) { if (task.status !== 'paused') return; const elapsed = Math.floor((Date.now() - task.pausedAt) / 1000); if (task.pauseUsedSeconds + elapsed >= PAUSE_LIMIT_SECONDS) { task.pauseUsedSeconds = PAUSE_LIMIT_SECONDS; task.status = 'in_progress'; task.lastTickAt = Date.now(); addEvent('pause_limit_reached', task); toast('15 分钟普通暂停已用完，已自动恢复专注。'); } }
function tick() { state.tasks.forEach(task => { updateRunningTask(task); updatePausedTask(task); }); saveState(); render(); if (!activeTask() && !state.tasks.some(task => task.status === 'paused')) stopTicker(); }
function startTicker() { if (!timerId) timerId = setInterval(tick, 1000); }
function stopTicker() { clearInterval(timerId); timerId = null; }

function openNodes(task) { editingNodesFor = task.id; els.nodeDialogTitle.textContent = `拆分：${task.title}`; renderNodeInputs(task.nodes); els.nodeDialog.showModal(); }
function renderNodeInputs(nodes) { const source = nodes.length ? nodes : [{ id: uid(), title: '', minutes: '', done: false }]; els.nodeList.innerHTML = source.map(node => `<div class="node-line" data-node-id="${node.id}"><input class="node-done" type="checkbox" ${node.done ? 'checked' : ''} aria-label="完成节点"><input class="node-title" maxlength="50" value="${escapeHtml(node.title)}" placeholder="节点内容"><input class="node-minutes" type="number" min="1" max="1440" value="${node.minutes || ''}" placeholder="分钟"><button class="node-remove" type="button" aria-label="删除节点">×</button></div>`).join(''); els.addNodeButton.disabled = source.length >= MAX_NODES; }
function saveNodes() { const task = state.tasks.find(item => item.id === editingNodesFor); if (!task) return; const lines = [...els.nodeList.querySelectorAll('.node-line')]; const nodes = lines.map(line => ({ id: line.dataset.nodeId, title: line.querySelector('.node-title').value.trim(), minutes: Number(line.querySelector('.node-minutes').value) || 0, done: line.querySelector('.node-done').checked })).filter(node => node.title); if (nodes.length > MAX_NODES) return; task.nodes = nodes; if (!nodes.length) task.manualProgress = 0; addEvent('nodes_updated', task); saveState(); render(); toast(nodes.length ? '节点已保存，完成一格就前进一步。' : '已清空节点，可直接完成或后续再拆分。'); }

els.taskForm.addEventListener('submit', event => { event.preventDefault(); const title = els.title.value.trim(); const minutes = Number(els.minutes.value); els.formMessage.textContent = ''; if (!title) { els.formMessage.textContent = '请写下要学习的内容。'; return; } if (!Number.isInteger(minutes) || minutes < 1) { els.formMessage.textContent = '请输入至少 1 分钟的预计时长。'; return; } if (!isTimeAllowed(minutes)) { els.formMessage.textContent = '预计时长会跨过今天 24:00，请缩短时长或明天再计划。'; return; } createTask(title, minutes); els.taskForm.reset(); });
els.taskList.addEventListener('click', event => { const button = event.target.closest('button[data-action]'); if (!button) return; const task = state.tasks.find(item => item.id === button.closest('[data-task-id]').dataset.taskId); if (!task) return; const action = button.dataset.action; if (action === 'start') task.status === 'paused' ? resumeTask(task) : startTask(task); if (action === 'complete') completeTask(task); if (action === 'nodes') openNodes(task); if (action === 'edit') editTask(task); if (action === 'delete') deleteTask(task); });
els.pauseButton.addEventListener('click', () => { const task = activeTask(); if (task) pauseTask(task); });
els.finishButton.addEventListener('click', () => completeTask(activeTask()));
els.focusTaskButton.addEventListener('click', () => document.querySelector('.task-card.running')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
els.todayButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
els.addNodeButton.addEventListener('click', () => { const nodes = [...els.nodeList.querySelectorAll('.node-line')]; if (nodes.length >= MAX_NODES) return; const placeholder = document.createElement('div'); placeholder.className = 'node-line'; placeholder.dataset.nodeId = uid(); placeholder.innerHTML = '<input class="node-done" type="checkbox" aria-label="完成节点"><input class="node-title" maxlength="50" placeholder="节点内容"><input class="node-minutes" type="number" min="1" max="1440" placeholder="分钟"><button class="node-remove" type="button" aria-label="删除节点">×</button>'; els.nodeList.append(placeholder); els.addNodeButton.disabled = nodes.length + 1 >= MAX_NODES; placeholder.querySelector('.node-title').focus(); });
els.nodeList.addEventListener('click', event => { if (!event.target.closest('.node-remove')) return; event.target.closest('.node-line').remove(); els.addNodeButton.disabled = els.nodeList.querySelectorAll('.node-line').length >= MAX_NODES; });
els.nodeForm.addEventListener('submit', event => { if (event.submitter?.value === 'cancel') return; event.preventDefault(); saveNodes(); els.nodeDialog.close(); });

function editTask(task) { if (task.status === 'in_progress') { toast('正在专注的任务请先暂停，再编辑。'); return; } const title = prompt('学习内容', task.title); if (title === null) return; const trimmed = title.trim(); if (!trimmed) { toast('任务内容不能为空。'); return; } const minutesText = prompt('预计时长（分钟）', task.plannedMinutes); if (minutesText === null) return; const minutes = Number(minutesText); if (!Number.isInteger(minutes) || minutes < 1 || !isTimeAllowed(minutes)) { toast('时长无效，或会跨过今天 24:00。'); return; } const elapsed = taskElapsed(task); task.title = trimmed; task.plannedMinutes = minutes; task.plannedSeconds = minutes * 60; task.remainingSeconds = Math.max(0, task.plannedSeconds - elapsed); addEvent('edited', task); saveState(); render(); toast('任务已更新。'); }
function deleteTask(task) { const first = confirm(`确定删除“${task.title}”吗？`); if (!first) return; if (task.status === 'in_progress' || task.status === 'paused') { const second = confirm('任务已经开始。再次确认后将作为“主动放弃”保留在日总结中，确定继续吗？'); if (!second) return; task.status = 'abandoned'; addEvent('abandoned', task); saveState(); render(); toast('已记为主动放弃，记录会保留在今日总结。'); return; } state.tasks = state.tasks.filter(item => item.id !== task.id); state.events = state.events.filter(event => event.taskId !== task.id); saveState(); render(); toast('任务已删除。'); }

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
state.tasks.forEach(task => { if (task.status === 'in_progress') { task.status = 'paused'; task.pausedAt = Date.now(); } });
saveState(); render(); if (state.tasks.some(task => task.status === 'paused')) startTicker();
