"use client";

import { useEffect, useState } from "react";
import { Download, X, Share2, PlusSquare, Building2, Sparkles, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallAppPromptProps {
  variant?: "customer" | "owner";
}

export function InstallAppPrompt({ variant = "customer" }: InstallAppPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const isOwner = variant === "owner";
  const storageKey = `mareb_pwa_dismissed_${variant}`;

  useEffect(() => {
    // 1. تسجيل Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("PWA SW registration:", err));
    }

    if (typeof window === "undefined") return;

    // 2. التحقق مما إذا كان التطبيق مثبتاً بالفعل (Standalone Mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // 3. التحقق مما إذا كان المستخدم قد أغلق الإشعار في الجلسة الحالية
    const isDismissed = sessionStorage.getItem(storageKey);
    if (isDismissed === "true") {
      return;
    }

    // 4. فحص نظام iOS (Safari)
    const isIosDevice =
      /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // إظهار البطاقة لأجهزة iOS بعد تأخير بسيط لإعطاء تجربة تصفح هادئة
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    // 5. اعتراض حدث المتصفح الافتراضي beforeinstallprompt (أندرويد والكمبيوتر)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [storageKey]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSInstructions(false);
    sessionStorage.setItem(storageKey, "true");
  };

  if (!showPrompt) {
    return null;
  }

  // النصوص والتصميم المخصص لكل تطبيق
  const title = isOwner ? "ثبّت تطبيق إدارة المنشآت" : "ثبّت تطبيق مأرب إيفنتس على هاتفك";
  const desc = isOwner
    ? "أدِر حجوزات قاعتك واستقبل طلبات الزبائن كتطبيق مستقل"
    : "وصول فوري للقاعات والاستراحات وإشعارات الحجز المباشرة";

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[420px] px-3.5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 dark:border-amber-500/30 rounded-3xl p-4 shadow-2xl shadow-slate-950/25 relative overflow-hidden transition-all text-right">
        {/* Glow Accent */}
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* زر إغلاق البطاقة */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="إغلاق التنبيه"
          className="absolute top-3.5 left-3.5 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* جسم البطاقة الأساسي */}
        <div className="flex items-start gap-3 pl-6">
          {/* الشعار */}
          {isOwner ? (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20 shrink-0">
              <Building2 className="w-6 h-6 text-slate-950" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/20 shrink-0">
              م
            </div>
          )}

          {/* النصوص التوضيحية */}
          <div className="flex-1 min-w-0 pr-0.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                {title}
              </h4>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <Sparkles className="w-2.5 h-2.5" />
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {desc}
            </p>
          </div>
        </div>

        {/* إرشادات أجهزة آيفون (iOS Safari) عند طلب التثبيت */}
        {isIOS && showIOSInstructions && (
          <div className="mt-3.5 p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 space-y-2 text-xs text-amber-950 dark:text-amber-200 animate-in fade-in duration-200">
            <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <Smartphone className="w-3.5 h-3.5" />
              <span>لتثبيت التطبيق على آيفون:</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300 leading-normal">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                  1
                </span>
                <span>
                  اضغط على أيقونة المشاركة{" "}
                  <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-amber-600 dark:text-amber-400" />{" "}
                  في شريط المتصفح السفلي.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                  2
                </span>
                <span>
                  مرر للأسفل واختر{" "}
                  <strong className="text-amber-700 dark:text-amber-300 font-bold inline-flex items-center gap-0.5">
                    <PlusSquare className="w-3 h-3 inline" /> (إضافة إلى الشاشة الرئيسية)
                  </strong>.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* أزرار الإجراء */}
        <div className="mt-3.5 flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-950" />
            <span>{isIOS && !showIOSInstructions ? "طريقة التثبيت على آيفون" : "تثبيت التطبيق"}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs transition active:scale-95 cursor-pointer"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
}
