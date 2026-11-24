// Service worker for My Task App
// Change CACHE_VERSION whenever you update your files so users get the new version.
const CACHE_VERSION = "v1";
const CACHE_NAME = "task-app-" + CACHE_VERSION;

const FILES_TO_CACHE = [
  "./",
  "./task-app.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

// Install: save the app files. A missing file (like an icon) won't break the install.
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(FILES_TO_CACHE.map(file => cache.add(file)))
    ).then(() => self.skipWaiting())
  );
});

// Activate: delete old caches from previous versions.
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: pages try the network first (so updates show up), then fall back to the cache offline.
// Everything else (icons, manifest) loads from the cache first for speed.
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match("./task-app.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      });
    })
  );
});

// When someone taps a notification, open or focus the app.
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("./task-app.html");
    })
  );
});
