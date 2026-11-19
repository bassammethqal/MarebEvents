"use client";

import { useTransition } from "react";
import { LogOut, Loader2 } from "lucide-react";
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
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    if (isPending) return;
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <>
      {/* Toast إشعار فوري عند الضغط */}
      {isPending && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-none">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
          <span className="text-xs font-bold">جاري تسجيل الخروج بأمان...</span>
        </div>
      )}

      {variant === "icon" && (
        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          title={title}
          aria-label={title}
          className={`p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900/50 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-60 ${className}`}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
        </button>
      )}

      {variant === "compact" && (
        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          className={`text-xs font-bold text-rose-400 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/50 px-3.5 py-2 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 active:scale-95 ${className}`}
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
          ) : (
            <LogOut className="w-3.5 h-3.5" />
          )}
          <span>{label || "خروج"}</span>
        </button>
      )}

      {variant === "pill" && (
        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          aria-label={title}
          className={`text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 px-2 py-1 rounded-full transition font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-60 active:scale-95 ${className}`}
        >
          {isPending ? (
            <Loader2 className="w-3 h-3 animate-spin text-rose-500" />
          ) : null}
          <span>{label || "خروج"}</span>
        </button>
      )}

      {variant === "button" && (
        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          className={`w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 active:scale-95 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer disabled:opacity-60 ${className}`}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          <span>{label || "تسجيل الخروج من الحساب"}</span>
        </button>
      )}
    </>
  );
}
