"use client";

import { useEffect } from "react";

// Registering doesn't prompt for anything — notification permission is still
// only requested when the user opts in to push.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
