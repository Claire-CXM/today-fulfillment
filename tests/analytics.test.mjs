import test from 'node:test';
import assert from 'node:assert/strict';
import { configureAnalytics, durationBucket, isAnalyticsHost, shouldTrackDailyFulfillment, trackAnalyticsEvent } from '../analytics.js';

test('匿名统计只在正式生产域名启用', async () => {
  assert.equal(isAnalyticsHost('today-fulfillment.netlify.app'), true);
  assert.equal(isAnalyticsHost('localhost'), false);
  assert.equal(await configureAnalytics(true, 'localhost'), false);
  assert.equal(trackAnalyticsEvent('daily_fulfillment_achieved', {}, 'localhost'), false);
});

test('时长只上报低敏感度区间值', () => {
  assert.equal(durationBucket(0), '0_30_min');
  assert.equal(durationBucket(30), '0_30_min');
  assert.equal(durationBucket(31), '31_60_min');
  assert.equal(durationBucket(60), '31_60_min');
  assert.equal(durationBucket(61), '61_120_min');
  assert.equal(durationBucket(120), '61_120_min');
  assert.equal(durationBucket(121), '121_plus_min');
});

test('关闭授权后事件上报立即变为无操作', async () => {
  await configureAnalytics(false, 'today-fulfillment.netlify.app');
  assert.equal(trackAnalyticsEvent('daily_fulfillment_achieved', {}, 'today-fulfillment.netlify.app'), false);
});

test('同一自然日只接受首次完成兑现', () => {
  assert.equal(shouldTrackDailyFulfillment(null, '2026-08-28'), true);
  assert.equal(shouldTrackDailyFulfillment('2026-08-27', '2026-08-28'), true);
  assert.equal(shouldTrackDailyFulfillment('2026-08-28', '2026-08-28'), false);
});
