import { savePushSubscription, deletePushSubscription } from "@/app/actions/notifications";

// Public by design — VAPID's whole point is that this half is safe to ship
// in client code; only the private half (an Edge Function secret) can sign
// push messages. Generated once for this project; changing it would
// silently break every already-subscribed browser until they re-subscribe.
export const VAPID_PUBLIC_KEY =
  "BOCS6_-S-PP0CzfRAsbMVH_l5Lc3O2zVSeMwnotaueplwt2JkOD2Mn780ibae5UjBzqdb0ve2005k3Qyq4c9cQk";

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes.buffer;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

// Registering the service worker itself doesn't prompt for anything, but
// `Notification.requestPermission()` must be called from a real user
// gesture (a click) — browsers silently ignore or auto-deny it otherwise.
export async function enablePushNotifications(): Promise<{ error: string | null }> {
  if (!pushSupported()) return { error: "Push notifications aren't supported in this browser." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { error: permission === "denied" ? "Notifications are blocked for this site." : "Permission dismissed." };
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { error: "Browser returned an incomplete subscription." };
  }

  return savePushSubscription({
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  });
}

export async function disablePushNotifications(): Promise<{ error: string | null }> {
  const subscription = await getExistingSubscription();
  if (!subscription) return { error: null };

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return deletePushSubscription(endpoint);
}
