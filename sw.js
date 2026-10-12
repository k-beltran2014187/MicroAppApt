// Retirado: este archivo solo existe para limpiar el guardado sin conexión de versiones anteriores.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k)));
    await self.registration.unregister();
    const cs = await self.clients.matchAll({ type: 'window' }); cs.forEach(c => c.navigate(c.url));
  })());
});
