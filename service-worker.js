const cacheName = "medication-calendar-v1";
const assetsToCache = [
  "/medication/",
  "/medication/index.html",
  "/medication/css/normalize.css",
  "/medication/css/main.css",
  "/medication/javascript/main.js",
  "/medication/images/favicon.ico",
  "/medication/images/1098028.png",
  "/medication/images/1098028.png",
];

// Install service worker
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(cacheName).then((cache) => {
      console.log("Caching assets");
      return cache.addAll(assetsToCache);
    })
  );
});

// Activate service worker
self.addEventListener("activate", (e) => {
  console.log("Service worker activated");
});

// Fetch from cache or network
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(e.request).then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(cacheName).then((cache) => {
            cache.put(e.request, clone);
          });
          return networkResponse;
        })
      );
    })
  );
});
