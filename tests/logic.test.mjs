import test from 'node:test';
import assert from 'node:assert/strict';

function progress(nodes, manual = 0) { return nodes.length ? Math.round(nodes.filter(node => node.done).length / nodes.length * 100) : manual; }
function timeAllowed(now, minutes) { const deadline = new Date(now); deadline.setHours(24, 0, 0, 0); return now.getTime() + minutes * 60000 <= deadline.getTime(); }
function dayState(tasks) { const complete = tasks.filter(task => task.status === 'completed').length; return !tasks.length || !complete ? 'red' : complete === tasks.length ? 'green' : 'yellow'; }

test('节点进度按完成节点数计算', () => assert.equal(progress([{ done: true }, { done: false }, { done: true }]), 67));
test('无节点任务使用手动进度', () => assert.equal(progress([], 40), 40));
test('预计时长不能跨日', () => { const now = new Date(2026, 7, 15, 23, 40, 0); assert.equal(timeAllowed(now, 20), true); assert.equal(timeAllowed(now, 21), false); });
test('日历正确返回红黄绿状态', () => { assert.equal(dayState([]), 'red'); assert.equal(dayState([{ status: 'planned' }, { status: 'completed' }]), 'yellow'); assert.equal(dayState([{ status: 'completed' }]), 'green'); });
