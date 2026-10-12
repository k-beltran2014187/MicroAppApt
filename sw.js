const CACHE = 'enganche-v5';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'calc.js', 'quote.js', 'config.js', 'icon.svg', 'manifest.webmanifest', 'fonts/inter.woff2', 'fonts/cormorant.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))));
  self.clients.claim();
});
// Abre al instante desde lo guardado y se actualiza en segundo plano (la versión nueva aparece al abrir de nuevo).
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
