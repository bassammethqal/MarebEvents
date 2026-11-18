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
        className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-700 dark:text-slate-300 transition shadow-2xs"
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
      className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs active:scale-95 cursor-pointer"
    >
      {isDark ? (
        <Sun3D className="w-5 h-5 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon3D className="w-5 h-5 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
