// Deliberately minimal: receives Web Push events while no CampusBin tab is
// open, and shows a branded offline page when a page load fails for lack of
// a connection. Pages themselves are never cached — they're per-user and
// auth-dependent, so serving a stale copy would be worse than no copy.

const OFFLINE_CACHE = "campusbin-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "CampusBin", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "CampusBin";
  const url = data.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      data: { url },
      tag: url, // a second message before the first is opened replaces it, not stacks
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.endsWith(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
