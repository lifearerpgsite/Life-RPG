// Service Worker do Life RPG Neon
// Arquivos do projeto: index.html, manifest.json e sw.js

const CACHE_NAME = 'life-rpg-neon-cache-v1';
const APP_FILES = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Guarda apenas os arquivos que estiverem disponíveis.
    await Promise.all(
      APP_FILES.map(async (file) => {
        try {
          const response = await fetch(file, { cache: 'reload' });
          if (response.ok) {
            await cache.put(file, response);
          }
        } catch (error) {
          // A instalação do service worker não falha se um arquivo
          // opcional não puder ser armazenado em cache.
        }
      })
    );

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter((key) => key.startsWith('life-rpg-neon-cache-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Não interfere em envios de formulários nem em outras requisições.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Só administra arquivos da mesma origem.
  if (url.origin !== self.location.origin) return;

  // Para abrir/atualizar páginas, tenta a rede primeiro e usa o cache
  // se o aparelho estiver sem conexão.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('./index.html', response.clone());
        }
        return response;
      } catch (error) {
        return (
          await caches.match(request) ||
          await caches.match('./index.html') ||
          new Response('Você está sem conexão. Conecte-se à internet e tente novamente.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          })
        );
      }
    })());
    return;
  }

  // Para os demais arquivos, usa o cache quando disponível e atualiza
  // o cache em segundo plano quando houver conexão.
  event.respondWith((async () => {
    const cached = await caches.match(request);

    const networkRequest = fetch(request)
      .then(async (response) => {
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      });

    if (cached) {
      event.waitUntil(networkRequest.catch(() => undefined));
      return cached;
    }

    try {
      return await networkRequest;
    } catch (error) {
      return new Response('Arquivo indisponível sem conexão.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
