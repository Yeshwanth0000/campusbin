// Deliberately minimal: this exists only to receive Web Push events while
// no CampusBin tab is open. It doesn't cache anything or intercept fetches
// — that's a separate (and much bigger) offline-support project.

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
