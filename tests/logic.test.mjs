import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PAUSE_LIMIT_SECONDS,
  availableMinutesUntilMidnight,
  calendarStateForTasks,
  durationToMinutes,
  effectivePauseSeconds,
  freeDayCards,
  isTaskTimeAllowed,
  monthCompletionRate,
  nodeDurationValid,
  reviewAppeal,
  taskProgress,
  warningMinutes
} from '../logic.js';

test('节点进度直接使用应用业务模块计算', () => {
  assert.equal(taskProgress({ nodes: [{ done: true }, { done: false }, { done: true }] }), 67);
});

test('无节点任务使用手动进度', () => {
  assert.equal(taskProgress({ nodes: [], manualProgress: 40 }), 40);
});

test('分钟和小时输入都能换算且最小为一分钟', () => {
  assert.equal(durationToMinutes('1', 'minutes'), 1);
  assert.equal(durationToMinutes('0.02', 'hours'), 1);
  assert.equal(durationToMinutes('1.5', 'hours'), 90);
  assert.equal(durationToMinutes('0.01', 'hours'), 0);
});

test('预计时长不能跨日', () => {
  const now = new Date(2026, 7, 15, 23, 40, 0);
  assert.equal(isTaskTimeAllowed(now, [], 20), true);
  assert.equal(isTaskTimeAllowed(now, [], 21), false);
});

test('当天已有任务会占用剩余可安排时长', () => {
  const now = new Date(2026, 7, 15, 22, 0, 0);
  const tasks = [{ id: 'a', status: 'planned', remainingSeconds: 61 * 60 }];
  assert.equal(availableMinutesUntilMidnight(now, tasks), 59);
  assert.equal(isTaskTimeAllowed(now, tasks, 59), true);
  assert.equal(isTaskTimeAllowed(now, tasks, 60), false);
});

test('编辑任务时可以排除自身剩余时长', () => {
  const now = new Date(2026, 7, 15, 22, 0, 0);
  const tasks = [{ id: 'a', status: 'planned', remainingSeconds: 60 * 60 }];
  assert.equal(availableMinutesUntilMidnight(now, tasks, 'a'), 120);
});

test('日历正确返回红黄绿状态', () => {
  assert.equal(calendarStateForTasks([]), 'red');
  assert.equal(calendarStateForTasks([{ status: 'planned' }, { status: 'completed' }]), 'yellow');
  assert.equal(calendarStateForTasks([{ status: 'completed' }]), 'green');
});

test('待补、自由日和未来日期具有独立状态', () => {
  assert.equal(calendarStateForTasks([{ status: 'makeup' }]), 'yellow');
  assert.equal(calendarStateForTasks([], { free: true }), 'free');
  assert.equal(calendarStateForTasks([], { future: true }), 'future');
});

test('每七个绿钩日解锁一张自由日卡并扣除已使用数', () => {
  assert.equal(freeDayCards(6, 0), 0);
  assert.equal(freeDayCards(14, 1), 1);
});

test('临期预警按任务总时长五分之一四舍五入且最低一分钟', () => {
  assert.equal(warningMinutes(30), 6);
  assert.equal(warningMinutes(8), 2);
  assert.equal(warningMinutes(1), 1);
});

test('月完成率排除自由日并按红黄绿计算', () => {
  assert.equal(monthCompletionRate({ green: 7, yellow: 2, red: 1, free: 3 }), 70);
  assert.equal(monthCompletionRate({ green: 0, yellow: 0, red: 0, free: 5 }), 0);
});

test('节点时长总和必须等于任务总时长且最多十个', () => {
  assert.equal(nodeDurationValid([{ minutes: 20 }, { minutes: 25 }], 45), true);
  assert.equal(nodeDurationValid([{ minutes: 20 }, { minutes: 20 }], 45), false);
  assert.equal(nodeDurationValid(Array.from({ length: 11 }, () => ({ minutes: 1 })), 11), false);
});

test('本地申辩规则驳回消极理由并允许客观突发原因', () => {
  assert.equal(reviewAppeal('因为一直刷视频拖延，所以没有完成').approved, false);
  assert.equal(reviewAppeal('家人突发疾病需要陪同前往医院处理').approved, true);
  assert.equal(reviewAppeal('有点事情').approved, false);
});

test('普通暂停累计上限为四十五分钟', () => {
  const paused = { status: 'paused', pauseUsedSeconds: 1200, pausedAt: 1_000 };
  assert.equal(effectivePauseSeconds(paused, 601_000), 1800);
  assert.equal(effectivePauseSeconds(paused, 1_601_000), PAUSE_LIMIT_SECONDS);
});
