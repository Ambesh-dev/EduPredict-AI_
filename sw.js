// Cache version bumps every deploy so old cached files (like an outdated
// config.js or style.css) never get stuck being served after you push an update.
const CACHE = 'edupredict-v7-' + '2026-10-01-r1';
const ASSETS = ['./', './index.html', './style.css', './app.js', './config.js', './manifest.webmanifest', './icon.svg'];

// Files that change on every deploy: always try the network first so an
// update on GitHub is picked up immediately, falling back to cache only
// when offline.
const NETWORK_FIRST = ['/', '/index.html', '/style.css', '/app.js', '/config.js'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isNetworkFirst = NETWORK_FIRST.some(p => url.pathname === p || url.pathname.endsWith(p));

  if (isNetworkFirst) {
    e.respondWith(
      fetch(e.request)
        .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
        .catch(() => caches.match(e.request).then(x => x || caches.match('./')))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(x => x || fetch(e.request).then(r => {
        const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
      }))
    );
  }
});
