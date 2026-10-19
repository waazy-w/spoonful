// Offline support: cache the app shell, serve cache-first, refresh in the background.
var CACHE = 'spoonful-v1';
var SHELL = ['./', 'index.html', 'styles.css', 'js/planner.js', 'js/store.js', 'js/app.js', 'icon.svg', 'manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(e.request, { ignoreSearch: true }).then(function (cached) {
      var network = fetch(e.request).then(function (res) {
        if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) cache.put(e.request, res.clone());
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    });
  }));
});
