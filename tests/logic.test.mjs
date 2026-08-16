import test from 'node:test';
import assert from 'node:assert/strict';

function progress(nodes, manual = 0) { return nodes.length ? Math.round(nodes.filter(node => node.done).length / nodes.length * 100) : manual; }
function timeAllowed(now, minutes) { const deadline = new Date(now); deadline.setHours(24, 0, 0, 0); return now.getTime() + minutes * 60000 <= deadline.getTime(); }
function dayState(tasks) { const complete = tasks.filter(task => task.status === 'completed').length; return !tasks.length || !complete ? 'red' : complete === tasks.length ? 'green' : 'yellow'; }

test('节点进度按完成节点数计算', () => assert.equal(progress([{ done: true }, { done: false }, { done: true }]), 67));
test('无节点任务使用手动进度', () => assert.equal(progress([], 40), 40));
test('预计时长不能跨日', () => { const now = new Date(2026, 7, 15, 23, 40, 0); assert.equal(timeAllowed(now, 20), true); assert.equal(timeAllowed(now, 21), false); });
test('日历正确返回红黄绿状态', () => { assert.equal(dayState([]), 'red'); assert.equal(dayState([{ status: 'planned' }, { status: 'completed' }]), 'yellow'); assert.equal(dayState([{ status: 'completed' }]), 'green'); });

function p1DayState(tasks, free = false) { if (free) return 'free'; if (tasks.some(task => task.status === 'makeup')) return 'yellow'; return dayState(tasks); }
function availableFreeDays(greenDays, usedDays) { return Math.max(0, Math.floor(greenDays / 7) - usedDays); }
function shouldWarn(task) { return !task.warned && task.remainingSeconds <= 1800 && task.progress < 60; }
function monthRate(green, yellow, red) { const counted = green + yellow + red; return counted ? Math.round(green / counted * 100) : 0; }

test('申辩任务和自由日具有独立日历状态', () => { assert.equal(p1DayState([{ status: 'makeup' }]), 'yellow'); assert.equal(p1DayState([], true), 'free'); });
test('每七个绿钩日解锁一张自由日卡并扣除已使用数', () => { assert.equal(availableFreeDays(6, 0), 0); assert.equal(availableFreeDays(14, 1), 1); });
test('临期预警仅在剩余三十分钟内且进度不足时触发', () => { assert.equal(shouldWarn({ warned: false, remainingSeconds: 1800, progress: 59 }), true); assert.equal(shouldWarn({ warned: true, remainingSeconds: 1200, progress: 20 }), false); assert.equal(shouldWarn({ warned: false, remainingSeconds: 1200, progress: 60 }), false); });
test('月完成率排除自由日并按红黄绿计算', () => { assert.equal(monthRate(7, 2, 1), 70); assert.equal(monthRate(0, 0, 0), 0); });
