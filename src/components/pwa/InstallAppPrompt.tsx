"use client";

import { useEffect, useState } from "react";
import {
  Download,
  X,
  Share2,
  PlusSquare,
  Building2,
  Sparkles,
  Smartphone,
  MoreVertical,
  Check,
  Copy,
} from "lucide-react";

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
  const [isIOS, setIsIOS] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [showInstructions, setShowInstructions] = useState<"none" | "ios" | "manual">("none");
  const [copied, setCopied] = useState(false);

  const isAdmin = variant === "admin";
  const isOwner = variant === "owner";
  const storageKey = `mareb_pwa_dismissed_${variant}`;

  useEffect(() => {
    // 1. تسجيل الـ Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("PWA SW registration:", err));
    }

    if (typeof window === "undefined") return;

    // 2. فحص ما إذا كان التطبيق مثبتاً ويعمل كـ Standalone App
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // 3. فحص ما إذا تم إغلاقه خلال هذه الجلسة
    const isDismissed = sessionStorage.getItem(storageKey);
    if (isDismissed === "true") {
      return;
    }

    // 4. فحص نوع الجهاز والمتصفح
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    setIsIOS(isIosDevice);

    const inApp =
      /instagram|fbav|fban|messenger|whatsapp|snapchat|line|micromessenger/.test(ua);
    setIsInAppBrowser(inApp);

    // 5. استعادة الحدث المبكر إذا كان المتصفح قد أطلقه قبل اكتمال تحميل المكون
    if (window.__pwaPrompt) {
      setDeferredPrompt(window.__pwaPrompt);
    }

    // 6. الاستماع لأي حدث جديد يطلقه المتصفح
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

    // 7. ضمان ظهور البطاقة بعد 1.5 ثانية لأي زائر لم يثبت التطبيق
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 1500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      delete window.__pwaHandler;
    };
  }, [storageKey]);

  const handleInstallClick = async () => {
    // إذا كان الحدث التلقائي متاحاً (Android / Desktop Chrome / Edge)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setShowPrompt(false);
        }
        setDeferredPrompt(null);
        window.__pwaPrompt = undefined;
        return;
      } catch (err) {
        console.warn("Prompt error:", err);
      }
    }

    // إذا كان جهاز آيفون
    if (isIOS) {
      setShowInstructions((prev) => (prev === "ios" ? "none" : "ios"));
      return;
    }

    // إذا كان متصفح أندرويد دون توفر الحدث المباشر أو متصفح داخلي
    setShowInstructions((prev) => (prev === "manual" ? "none" : "manual"));
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowInstructions("none");
    sessionStorage.setItem(storageKey, "true");
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!showPrompt) {
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
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[420px] px-3.5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 dark:border-amber-500/30 rounded-3xl p-4 shadow-2xl shadow-slate-950/30 relative overflow-hidden transition-all text-right">
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

        {/* إرشادات أجهزة آيفون (iOS Safari) */}
        {showInstructions === "ios" && (
          <div className="mt-3.5 p-3 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 space-y-2 text-xs text-amber-950 dark:text-amber-200 animate-in fade-in duration-200">
            <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <Smartphone className="w-3.5 h-3.5" />
              <span>طريقة التثبيت على آيفون (Safari):</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300 leading-normal">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                  1
                </span>
                <span>
                  اضغط على زر المشاركة{" "}
                  <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-amber-600 dark:text-amber-400" />{" "}
                  في شريط Safari بالأسفل.
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

        {/* إرشادات التثبيت اليدوي لأندرويد والمتصفحات الداخلية */}
        {showInstructions === "manual" && (
          <div className="mt-3.5 p-3 rounded-2xl bg-blue-50/90 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700 space-y-2 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in duration-200">
            <div className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
              <MoreVertical className="w-3.5 h-3.5" />
              <span>خطوات تثبيت التطبيق:</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                  1
                </span>
                <span>اضغط على قائمة المتصفح (⋮) في أعلى أو أسفل الشاشة.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                  2
                </span>
                <span>
                  اختر <strong className="text-blue-600 dark:text-blue-400">تثبيت التطبيق</strong> أو{" "}
                  <strong className="text-blue-600 dark:text-blue-400">إضافة إلى الشاشة الرئيسية</strong>.
                </span>
              </div>
            </div>

            {isInAppBrowser && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">لأفضل تجربة، افتح الرابط في Chrome:</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "تم النسخ" : "نسخ الرابط"}</span>
                </button>
              </div>
            )}
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
            <span>
              {deferredPrompt
                ? "تثبيت التطبيق الآن"
                : isIOS
                ? "طريقة التثبيت على آيفون"
                : "تثبيت التطبيق"}
            </span>
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
