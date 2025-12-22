// public/sw.js
// Service Worker for PWA offline support

const CACHE_NAME = "vantage-v2";
const RUNTIME_CACHE = "vantage-runtime";

const PRECACHE_URLS = [
  "/",
  "/offline",
  "/login",
  "/manifest.json",
  "/icons/ios/180.png",
  "/icons/ios/192.png",
];

// Install event - precache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }),
  );
  if (!self.registration.active) {
    self.skipWaiting();
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match("/offline").then((offline) => {
              return offline || caches.match("/");
            });
          });
        }),
    );
    return;
  }

  // API requests - network first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((cachedResponse) => {
            return (
              cachedResponse ||
              new Response(JSON.stringify({ error: "Offline", cached: true }), {
                status: 503,
                headers: { "Content-Type": "application/json" },
              })
            );
          });
        }),
    );
    return;
  }

  // Static assets - cache first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match("/offline").then((offline) => {
            return offline || caches.match("/");
          });
        });
    }),
  );
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-portfolio") {
    event.waitUntil(syncPortfolio());
  }
});

async function syncPortfolio() {
  // Implement background sync logic
  console.log("Background sync triggered");
}

// Push notifications
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  const title = data.title || "Vantage";
  let body = typeof data.body === "string" ? data.body : "";
  if (!body) body = "新しい通知があります";

  const m =
    /^(.+?) が ([0-9,]+) を(上回りました|下回りました) \(現在 ([0-9,]+)\)$/.exec(
      body,
    );
  if (m) {
    const stockLabel = m[1];
    const target = m[2];
    const directionLabel = m[3] === "上回りました" ? "以上" : "以下";
    const current = m[4];
    body = `${stockLabel}\n条件: ${target}円 ${directionLabel}\n現在値: ${current}円`;
  }

  const options = {
    body,
    icon: "/icons/ios/192.png",
    badge: "/icons/ios/192.png",
    data: data.url,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.notification.data) {
    event.waitUntil(clients.openWindow(event.notification.data));
  }
});
