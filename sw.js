const CACHE_NAME = 'life-rpg-neon-v3';
const APP_FILES = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_FILES.map(async file => {
      try { const response = await fetch(file, {cache:'reload'}); if (response.ok) await cache.put(file, response); } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('life-rpg-neon-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) { const cache = await caches.open(CACHE_NAME); await cache.put('./index.html', response.clone()); }
        return response;
      } catch (_) { return (await caches.match(request)) || (await caches.match('./index.html')) || new Response('Sem conexão. Conecte-se à internet e tente novamente.', {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}); }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request).then(async response => { if (response.ok) { const cache=await caches.open(CACHE_NAME); await cache.put(request,response.clone()); } return response; });
    if (cached) { event.waitUntil(network.catch(()=>undefined)); return cached; }
    try { return await network; } catch (_) { return new Response('Arquivo indisponível sem conexão.',{status:503}); }
  })());
});
