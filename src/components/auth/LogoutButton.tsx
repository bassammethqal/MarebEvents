"use client";

import { useState, useTransition, useEffect } from "react";
import { LogOut, Loader2, AlertTriangle, X } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";

interface LogoutButtonProps {
  variant?: "button" | "icon" | "compact" | "pill";
  label?: string;
  className?: string;
  title?: string;
}

export function LogoutButton({
  variant = "button",
  label,
  className = "",
  title = "تسجيل الخروج",
}: LogoutButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  // إغلاق النافذة بزر Escape
  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) {
        setShowModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal, isPending]);

  const handleConfirmLogout = () => {
    if (isPending) return;
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <>
      {/* الأزرار بمختلف الأشكال */}
      {variant === "icon" && (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          title={title}
          aria-label={title}
          className={`p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900/50 shadow-sm transition active:scale-95 cursor-pointer ${className}`}
        >
          <LogOut className="w-4 h-4" />
        </button>
      )}

      {variant === "compact" && (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className={`text-xs font-bold text-rose-400 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/50 px-3.5 py-2 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer active:scale-95 ${className}`}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{label || "خروج"}</span>
        </button>
      )}

      {variant === "pill" && (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          aria-label={title}
          className={`text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 px-2 py-1 rounded-full transition font-semibold inline-flex items-center gap-1 cursor-pointer active:scale-95 ${className}`}
        >
          <span>{label || "خروج"}</span>
        </button>
      )}

      {variant === "button" && (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className={`w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 active:scale-95 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer ${className}`}
        >
          <LogOut className="w-4 h-4" />
          <span>{label || "تسجيل الخروج من الحساب"}</span>
        </button>
      )}

      {/* نافذة تأكيد تسجيل الخروج المنبثقة (Modal Dialog) */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative text-center animate-in zoom-in-95 duration-200 transition-all"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
          >
            {/* زر إغلاق علوي */}
            {!isPending && (
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="إغلاق"
                className="absolute top-4 left-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* أيقونة التنبيه */}
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20 shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            {/* العنوان والنص التوضيحي */}
            <h3
              id="logout-dialog-title"
              className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-1.5"
            >
              تأكيد تسجيل الخروج
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟
            </p>

            {/* أزرار الإجراء */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isPending}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>{isPending ? "جاري الخروج..." : "نعم، تسجيل الخروج"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isPending}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition active:scale-95 cursor-pointer"
              >
                العودة
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
