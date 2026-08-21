const CACHE = 'today-fulfillment-v10';
const ASSETS = ['./', './index.html', './styles.css?v=10', './app.js?v=10', './logic.js?v=10', './manifest.webmanifest', './icon.svg', './node_modules/@ionic/core/css/ionic.bundle.css', './node_modules/@ionic/core/loader/index.es2017.js'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(Promise.all([
  caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))),
  self.clients.claim()
])));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    if (event.request.mode === 'navigate') return caches.match('./index.html');
    return Response.error();
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const existing = windows[0];
    if (existing) return existing.focus().then(client => { client.postMessage({ type: 'OPEN_VIEW', view: event.notification.data?.view || 'today' }); return client; });
    return clients.openWindow(new URL('./', self.registration.scope).href);
  }));
});
