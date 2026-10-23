const CACHE = 'cashy-shell-v2';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(['/offline.html', '/icon.svg']);
    try {
      const shell = await fetch('/', { cache: 'reload' });
      if (!shell.ok || shell.redirected || shell.headers.get('X-Cashy-Public-Shell') !== '1') return;
      const html = await shell.clone().text();
      await cache.put('/', shell);
      const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"?]+(?:\?[^" ]*)?)"/g)].map(match => match[1]))];
      await Promise.allSettled(assets.map(asset => cache.add(asset)));
    } catch { /* A later successful root navigation warms the shell cache. */ }
  })());
  self.skipWaiting();
});
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('cashy-shell-') && key !== CACHE).map(key => caches.delete(key))))); self.clients.claim(); });
// Cache only the public root shell (no financial data), static code and offline fallback.
// Never cache API responses, PDFs, sign-in pages or authentication resources.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(async response => {
      if (url.pathname === '/' && response.ok && !response.redirected && response.headers.get('X-Cashy-Public-Shell') === '1') {
        const cache = await caches.open(CACHE);
        await cache.put('/', response.clone());
      }
      return response;
    }).catch(async () => (url.pathname === '/' && await caches.match('/')) || await caches.match('/offline.html')));
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(async response => {
      if (response.ok) { const cache = await caches.open(CACHE); await cache.put(event.request, response.clone()); }
      return response;
    })));
  }
});
