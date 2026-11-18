"use client";

import { useState, useSyncExternalStore } from "react";
import { Moon3D, Sun3D } from "@/components/ui/Icons3D";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const hasDarkClass = document.documentElement.classList.contains("dark");
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark" || hasDarkClass;
  });

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  if (!isClient) {
    return (
      <button
        type="button"
        aria-label="تبديل المظهر"
        className="w-10 h-10 rounded-2xl border border-slate-300 dark:border-amber-400/50 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-800 dark:text-amber-300 transition-all shadow-xs cursor-pointer"
      >
        <Moon3D className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}
      title={isDark ? "تبديل إلى الوضع النهاري" : "تبديل إلى الوضع الليلي"}
      className="w-10 h-10 rounded-2xl border border-slate-300 dark:border-amber-400/50 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-800 dark:text-amber-300 transition-all shadow-xs active:scale-90 cursor-pointer"
    >
      {isDark ? (
        <Sun3D className="w-5 h-5 transition-transform duration-300 hover:rotate-45 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]" />
      ) : (
        <Moon3D className="w-5 h-5 transition-transform duration-300 hover:-rotate-12 drop-shadow-[0_2px_6px_rgba(30,41,59,0.3)]" />
      )}
    </button>
  );
}
