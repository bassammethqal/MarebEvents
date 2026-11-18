"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
      );
    }
    return false;
  });
  const [isIOS] = useState(() => {
    if (typeof window !== "undefined") {
      return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    }
    return false;
  });
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("PWA: Service Worker registered, scope:", reg.scope))
        .catch((err) => console.warn("PWA: SW registration error:", err));
    }

    if (isInstalled) {
      return;
    }

    // Check if dismissed before
    const isDismissed = localStorage.getItem("mareb_pwa_dismissed");
    if (isDismissed) {
      return;
    }

    // Capture Android/Desktop Chrome beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // If iOS and not dismissed, show banner after brief delay
    if (isIOS) {
      const timer = setTimeout(() => setShowBanner(true), 2500);
      return () => clearTimeout(timer);
    }

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isInstalled, isIOS]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSModal(false);
    localStorage.setItem("mareb_pwa_dismissed", "true");
  };

  if (isInstalled || !showBanner) return null;

  return (
    <>
      {/* Floating Mobile Install Pill / Banner */}
      <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-3.5 shadow-2xl shadow-amber-500/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center p-1 shadow-md shadow-amber-500/20 shrink-0 relative">
              <Image
                src="/icons/icon-192x192.png"
                alt="فعاليات مأرب"
                width={44}
                height={44}
                className="h-full w-full object-contain rounded-lg"
              />
            </div>
            <div className="text-right">
              <h4 className="text-xs font-bold text-white leading-tight">تطبيق فعاليات مأرب</h4>
              <p className="text-[11px] text-slate-300 font-normal">
                تثبيت على الشاشة لتجربة حجز أسرع
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl shadow transition active:scale-95"
            >
              تثبيت
            </button>
            <button
              onClick={handleDismiss}
              aria-label="إغلاق"
              className="text-slate-400 hover:text-slate-200 p-1.5 transition text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Install Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-sm w-full text-right shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400 text-2xl font-bold">
              📱
            </div>
            <h3 className="text-base font-bold text-white text-center mb-1">
              تثبيت فعاليات مأرب على آيفون
            </h3>
            <p className="text-xs text-slate-400 text-center mb-5">
              خطوات سريعة لإضافة التطبيق لشاشتك الرئيسية
            </p>

            <div className="space-y-3 text-xs text-slate-200 mb-6">
              <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <span className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <span>
                  اضغط على زر المشاركة{" "}
                  <span className="font-bold text-amber-300">⎋ (Share)</span> في شريط المتصفح
                  بالأسفل.
                </span>
              </div>
              <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <span className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <span>
                  مرر للأسفل واختر{" "}
                  <span className="font-bold text-amber-300">إضافة إلى الشاشة الرئيسية ⊕</span>.
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-3 rounded-xl transition"
            >
              فهمت ذلك
            </button>
          </div>
        </div>
      )}
    </>
  );
}
