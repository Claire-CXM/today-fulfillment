import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [app, html, worker] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8')
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
});

test('页面与 Service Worker 使用一致的资源版本', () => {
  const appVersion = html.match(/app\.js\?v=(\d+)/)?.[1];
  const styleVersion = html.match(/styles\.css\?v=(\d+)/)?.[1];
  assert.equal(appVersion, styleVersion);
  assert.match(worker, new RegExp(`app\\.js\\?v=${appVersion}`));
  assert.match(worker, new RegExp(`styles\\.css\\?v=${styleVersion}`));
  assert.match(worker, new RegExp(`logic\\.js\\?v=${appVersion}`));
});
