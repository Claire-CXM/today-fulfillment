import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [app, analytics, html, worker, styles, build, design] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../analytics.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../build.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../DESIGN.md', import.meta.url), 'utf8')
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
  assert.match(app, /const nodeProgress = task\.nodes\.length \?/);
  assert.match(app, /\$\{nodeProgress\}<div class="task-actions">/);
});

test('兑现花径使用真实任务完成比例并保留可读状态', () => {
  assert.match(html, /id="daily-path-fill"/);
  assert.match(html, /id="daily-path-caption"/);
  assert.match(app, /Math\.round\(\(completed \/ tasks\.length\) \* 100\)/);
  assert.match(app, /dailyPathCaption\.textContent/);
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

test('图二视觉资产、真实导航图标与构建产物保持完整', () => {
  assert.match(design, /图二/);
  assert.match(html, /assets\/journey-stones-v3\.png/);
  assert.match(app, /assets\/growth-badge\.png/);
  assert.match(html, /assets\/icons\/home-outline\.svg/);
  assert.match(build, /cp\(join\(root, 'assets'\), join\(output, 'assets'\)/);
  assert.match(worker, /assets\/icons\/trophy-outline\.svg/);
});

test('主导航切页回到顶部且悬浮导航不受 body 变换影响', () => {
  assert.match(app, /window\.scrollTo\(\{ top: 0, left: 0, behavior: 'instant' \}\)/);
  assert.match(styles, /body \{ transform:none !important; \}/);
});

test('子页隐藏主导航并统一使用品牌确认弹窗与真实图标资产', () => {
  assert.match(html, /<body data-view="today">/);
  assert.match(html, /class="profile-mark"><img src="assets\/growth-badge\.png"/);
  assert.match(html, /class="info-icon"><img src="assets\/icons\/calendar-outline\.svg"/);
  assert.match(app, /showConfirm\(title, message, acceptLabel = '确认'\) \{ return showFallbackConfirm/);
  assert.match(styles, /body\[data-view="focus"\] \.bottom-nav/);
  assert.match(styles, /body\[data-view="task-editor"\] \.mini-focus-bar/);
});

test('临时状态使用真实素材、统一弹窗并覆盖窄屏布局', () => {
  assert.match(html, /class="celebration-card"><img src="assets\/growth-badge\.png"/);
  assert.match(html, /ionic\/svg\/close\.svg/);
  assert.match(app, /class="empty-state-asset" src="assets\/growth-badge\.png"/);
  assert.doesNotMatch(app, /class="empty-state-mark">今/);
  assert.match(styles, /V24: transient states and feedback/);
  assert.match(styles, /@media \(max-width:360px\)/);
  assert.match(worker, /ionic\/svg\/close\.svg/);
});

test('最终交互细节使用正式方向图标与可访问触控尺寸', () => {
  assert.match(html, /ionic\/svg\/caret-back\.svg/);
  assert.match(html, /ionic\/svg\/caret-forward\.svg/);
  assert.doesNotMatch(html, /aria-label="返回任务清单">‹/);
  assert.doesNotMatch(html, /aria-label="上个月">‹/);
  assert.match(worker, /ionic\/svg\/caret-back\.svg/);
  assert.match(styles, /V25: final interaction and accessibility polish/);
  assert.match(styles, /summary:focus-visible/);
  assert.match(styles, /\.icon-button \{ width:44px; height:44px; \}/);
  assert.match(styles, /\.node-remove \{ width:44px; height:44px;/);
});

test('我的页面提供可访问的飞书问题反馈入口', () => {
  assert.match(html, /class="settings-link feedback-link"/);
  assert.match(html, /href="https:\/\/pcngz2vyw6hl\.feishu\.cn\/share\/base\/shrcnIy3JQYSGIynAsv46tx0d1b"/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /aria-label="问题反馈：告诉我们你的体验与建议（在新标签页打开）"/);
  assert.match(html, /ionic\/svg\/chatbubble-ellipses-outline\.svg/);
  assert.match(html, /ionic\/svg\/chevron-forward\.svg/);
  assert.match(styles, /\.settings-link \{[\s\S]*min-height:72px;/);
  assert.match(styles, /\.settings-link:focus-visible/);
  assert.match(worker, /today-fulfillment-v27/);
  assert.match(worker, /ionic\/svg\/chatbubble-ellipses-outline\.svg/);
  assert.match(worker, /ionic\/svg\/chevron-forward\.svg/);
});

test('51.LA 统计遵循隐私开关并只记录每日首次兑现', () => {
  assert.match(html, /id="usage-analytics" type="checkbox" role="switch"/);
  assert.match(html, /aria-describedby="analytics-description"/);
  assert.match(app, /usageAnalytics: \$\('#usage-analytics'\)/);
  assert.match(app, /configureAnalytics\(state\.settings\.usageAnalytics\)/);
  assert.match(app, /shouldTrackDailyFulfillment\(state\.analytics\.lastFulfillmentDate, task\.actualCompletedDate\)/);
  assert.match(app, /trackAnalyticsEvent\('daily_fulfillment_achieved'/);
  assert.doesNotMatch(analytics, /taskTitle|task\.title|taskId|contact/);
  assert.match(analytics, /autoTrack: true/);
  assert.match(analytics, /hostname === PRODUCTION_HOST/);
  assert.match(build, /'analytics\.js'/);
  assert.match(worker, /analytics\.js\?v=27/);
});
