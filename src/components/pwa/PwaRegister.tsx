"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("PWA: Service Worker registered, scope:", reg.scope))
        .catch((err) => console.warn("PWA: SW registration error:", err));
    }
  }, []);

  return null;
}
