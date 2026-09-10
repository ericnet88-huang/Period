const cacheName = 'momo-cycle-v1';
const appShell = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/momo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(appShell)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (event.request.method === 'GET' && new URL(event.request.url).origin === self.location.origin) {
      const copy = response.clone();
      caches.open(cacheName).then((cache) => cache.put(event.request, copy));
    }
    return response;
  })));
});