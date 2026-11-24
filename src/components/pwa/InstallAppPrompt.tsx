"use client";

import { useEffect, useState } from "react";
import { Download, X, Building2, Sparkles } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __pwaPrompt?: BeforeInstallPromptEvent;
    __pwaHandler?: (e: BeforeInstallPromptEvent) => void;
  }
}

interface InstallAppPromptProps {
  variant?: "customer" | "owner" | "admin";
}

export function InstallAppPrompt({ variant = "customer" }: InstallAppPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const isAdmin = variant === "admin";
  const isOwner = variant === "owner";

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. تسجيل الـ Service Worker في حال لم يكن مسجلاً
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("PWA SW registration:", err));
    }

    // 2. فحص ما إذا كان التطبيق مثبتاً ويعمل كـ Standalone App
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // 3. استعادة الحدث المبكر إذا أطلقه المتصفح قبل اكتمال تحميل المكون
    if (window.__pwaPrompt) {
      setDeferredPrompt(window.__pwaPrompt);
      setShowPrompt(true);
    }

    // 4. الاستماع لحدث التثبيت المباشر من المتصفح
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__pwaPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      setShowPrompt(true);
    };

    window.__pwaHandler = (e: BeforeInstallPromptEvent) => {
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      window.__pwaPrompt = undefined;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      delete window.__pwaHandler;
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
      window.__pwaPrompt = undefined;
    } catch (err) {
      console.warn("Prompt error:", err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || !deferredPrompt) {
    return null;
  }

  let title = "ثبّت تطبيق مأرب إيفنتس على هاتفك";
  let desc = "وصول فوري للقاعات والاستراحات وتحديثات الحجز المباشرة";

  if (isAdmin) {
    title = "ثبّت لوحة تحكم الإدارة";
    desc = "وصول مباشر وسريع لإدارة المنصة وحسابات الملاك ومراقبة الحجوزات";
  } else if (isOwner) {
    title = "ثبّت تطبيق إدارة المنشآت";
    desc = "أدِر حجوزات قاعتك واستقبل طلبات الزبائن كتطبيق مستقل وسريع";
  }

  return (
    <div className="fixed bottom-24 sm:bottom-6 inset-x-3.5 mx-auto w-auto max-w-[420px] z-[9999] pointer-events-auto animate-in fade-in duration-300">
      <div className="bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-amber-500/40 dark:border-amber-500/30 rounded-3xl p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)] relative overflow-hidden transition-all text-right">
        {/* Glow Accent */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* زر الإغلاق */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="إغلاق التنبيه"
          className="absolute top-3.5 left-3.5 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* معلومات التطبيق */}
        <div className="flex items-start gap-3 pl-6">
          {isAdmin ? (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20 shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          ) : isOwner ? (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20 shrink-0">
              <Building2 className="w-6 h-6 text-slate-950" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/20 shrink-0">
              م
            </div>
          )}

          <div className="flex-1 min-w-0 pr-0.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                {title}
              </h4>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <Sparkles className="w-2.5 h-2.5" />
                تطبيق فوري
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {desc}
            </p>
          </div>
        </div>

        {/* أزرار الإجراء */}
        <div className="mt-3.5 flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-950" />
            <span>تثبيت التطبيق الآن</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs transition active:scale-95 cursor-pointer"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
}
