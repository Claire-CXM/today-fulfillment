const CACHE = 'today-fulfillment-v35';
const ASSETS = ['./', './index.html', './styles.css?v=35', './app.js?v=35', './analytics.js?v=35', './logic.js?v=35', './storage.js?v=35', './cloud-sync.js?v=35', './supabase-client.js?v=35', './manifest.webmanifest', './icon.svg', './assets/title-leaf-flourish.png', './assets/journey-stones-v3.png', './assets/growth-badge.png', './assets/icons/add-outline.svg', './assets/icons/home-outline.svg', './assets/icons/calendar-outline.svg', './assets/icons/pie-chart-outline.svg', './assets/icons/trophy-outline.svg', './assets/icons/person-outline.svg', './assets/icons/book-outline.svg', './assets/icons/document-text-outline.svg', './assets/icons/alert-circle-outline.svg', './assets/icons/refresh-circle-outline.svg', './assets/icons/list-outline.svg', './node_modules/@ionic/core/css/ionic.bundle.css', './node_modules/@ionic/core/loader/index.es2017.js', './node_modules/@supabase/supabase-js/dist/umd/supabase.js', './node_modules/@ionic/core/dist/ionic/svg/close.svg', './node_modules/@ionic/core/dist/ionic/svg/caret-back.svg', './node_modules/@ionic/core/dist/ionic/svg/caret-forward.svg', './node_modules/@ionic/core/dist/ionic/svg/chatbubble-ellipses-outline.svg', './node_modules/@ionic/core/dist/ionic/svg/chevron-forward.svg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(Promise.all([
  caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))),
  self.clients.claim()
])));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (event.request.mode !== 'navigate' && cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      if (cached) return cached;
      if (event.request.mode === 'navigate') return caches.match('./index.html');
      return Response.error();
    }
  })());
});

const REMINDER_DB = 'today-fulfillment-backup';
const REMINDER_STORE = 'snapshots';
function reminderDateKey(date = new Date()) { const offset = date.getTimezoneOffset() * 60000; return new Date(date - offset).toISOString().slice(0, 10); }
function openReminderDatabase() {
  return new Promise(resolve => {
    const request = indexedDB.open(REMINDER_DB, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(REMINDER_STORE)) request.result.createObjectStore(REMINDER_STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}
async function readReminderSnapshot() {
  const database = await openReminderDatabase();
  if (!database) return null;
  return new Promise(resolve => {
    const request = database.transaction(REMINDER_STORE, 'readonly').objectStore(REMINDER_STORE).get('latest');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}
async function writeReminderSnapshot(snapshot) {
  const database = await openReminderDatabase();
  if (!database) return;
  await new Promise(resolve => {
    const transaction = database.transaction(REMINDER_STORE, 'readwrite');
    transaction.objectStore(REMINDER_STORE).put(snapshot, 'latest');
    transaction.oncomplete = resolve;
    transaction.onerror = resolve;
    transaction.onabort = resolve;
  });
}
async function runBackgroundReminderFallback() {
  const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (windows.length) { windows.forEach(client => client.postMessage({ type: 'CHECK_REMINDER' })); return; }
  const snapshot = await readReminderSnapshot();
  const state = snapshot?.data;
  if (!state) return;
  const today = reminderDateKey();
  if (state.tasks?.some(task => task.date === today) || state.freeDays?.includes(today) || state.reminderDeliveries?.some(item => item.date === today)) return;
  const now = new Date(); const [hour, minute] = String(state.settings?.reminderTime || '10:00').split(':').map(Number); const reminderAt = new Date(now); reminderAt.setHours(hour, minute, 0, 0);
  if (now < reminderAt) return;
  await self.registration.showNotification('该安排今天的任务了', { body: '打开“今日兑现”，为今天发布最重要的学习任务。', icon: './icon.svg', tag: `plan-${today}`, data: { view: 'today' } });
  const deliveredAt = new Date().toISOString();
  state.reminderDeliveries ||= [];
  state.reminderDeliveries.push({ date: today, deliveredAt, source: 'periodic_sync_worker' });
  state.reminderDiagnostics = { ...(state.reminderDiagnostics || {}), lastCheckedAt: deliveredAt, lastResult: 'delivered', lastDeliveredAt: deliveredAt, lastError: null };
  await writeReminderSnapshot({ ...snapshot, revision: (Number(snapshot.revision) || 0) + 1, savedAt: Date.now(), data: state });
}
self.addEventListener('periodicsync', event => {
  if (event.tag === 'plan-reminder-fallback') event.waitUntil(runBackgroundReminderFallback());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const existing = windows[0];
    if (existing) return existing.focus().then(client => { client.postMessage({ type: 'OPEN_VIEW', view: event.notification.data?.view || 'today' }); return client; });
    return clients.openWindow(new URL('./', self.registration.scope).href);
  }));
});
