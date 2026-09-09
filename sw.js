const CACHE_NAME = 'beer-tracker-v6';
const urlsToCache = ['./', './index.html', './manifest.json', './group-password-ui.js'];
self.addEventListener('install', event => { self.skipWaiting(); event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(async response => { const type = response.headers.get('content-type') || ''; if (!type.includes('text/html')) return response; const html = await response.text(); const injected = html.replace('</body>', '<script src="./group-password-ui.js?v=6"></script></body>'); return new Response(injected, { status: response.status, statusText: response.statusText, headers: response.headers }); }).catch(() => caches.match(event.request).then(r => r || caches.match('./index.html'))));
    return;
  }
  if (new URL(event.request.url).pathname.endsWith('/group-password-ui.js')) {
    event.respondWith(fetch(event.request).catch(() => caches.match('./group-password-ui.js')));
    return;
  }
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
