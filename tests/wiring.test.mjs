import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [app, html, worker, styles] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8')
]);

test('任务表单把当前时长单位传入真实换算函数', () => {
  assert.match(app, /durationToMinutes\(els\.duration\.value, durationUnit\)/);
});

test('底部导航由应用事件统一驱动且不依赖内联脚本', () => {
  assert.match(app, /querySelectorAll\('\.nav-item'\).*switchView\(button\.dataset\.target\)/);
  assert.doesNotMatch(html, /onclick=/);
});

test('主动放弃和提醒设置具有页面入口', () => {
  assert.match(html, /id="abandon-focus-button"/);
  assert.match(html, /id="reminder-time"/);
  assert.match(html, /id="notification-permission"/);
  assert.match(html, /id="test-notification"/);
  assert.match(html, /id="reminder-diagnostics"/);
});

test('提醒使用精确定时、页面恢复补检和 PWA 后台补偿', () => {
  assert.match(app, /function scheduleReminderCheck\(\)/);
  assert.match(app, /checkReminderDelivery\('visibility_resume'\)/);
  assert.match(app, /periodicSync\.register\('plan-reminder-fallback'/);
  assert.match(worker, /addEventListener\('periodicsync'/);
  assert.match(worker, /runBackgroundReminderFallback/);
});

test('建议任务支持换一批且无节点专注页不提供手动进度控件', () => {
  assert.match(html, /id="shuffle-suggestions"/);
  assert.match(app, /pickSuggestionBatch\(SUGGESTION_POOL, currentSuggestions\)/);
  assert.doesNotMatch(app, /data-manual-progress/);
  assert.match(app, /focusProgress\.hidden = !task\.nodes\.length/);
});

test('复盘月度状态使用与日历一致的文字', () => {
  assert.match(app, /<span>全部完成<\/span>/);
  assert.match(app, /<span>部分完成<\/span>/);
  assert.match(app, /<span>未完成<\/span>/);
});

test('页面与 Service Worker 使用一致的资源版本', () => {
  const appVersion = html.match(/app\.js\?v=(\d+)/)?.[1];
  const styleVersion = html.match(/styles\.css\?v=(\d+)/)?.[1];
  assert.equal(appVersion, styleVersion);
  assert.match(worker, new RegExp(`app\\.js\\?v=${appVersion}`));
  assert.match(worker, new RegExp(`styles\\.css\\?v=${styleVersion}`));
  assert.match(worker, new RegExp(`logic\\.js\\?v=${appVersion}`));
  assert.match(worker, new RegExp(`storage\\.js\\?v=${appVersion}`));
});

test('原生页面滚动不受 Ionic 全局 body 锁定影响', () => {
  assert.match(styles, /html \{ min-height:100%; overflow-y:scroll; overscroll-behavior-y:auto; \}/);
  assert.match(styles, /body \{ position:static;[\s\S]*overflow-y:auto;[\s\S]*touch-action:pan-y;/);
});
