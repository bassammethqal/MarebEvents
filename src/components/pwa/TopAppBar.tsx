"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationPopover } from "@/components/ui/NotificationPopover";
import { Pin3D } from "@/components/ui/Icons3D";

export function TopAppBar() {
  const pathname = usePathname();

  // لا يظهر في صفحات الدخول والتسجيل
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  const isHome = pathname === "/";

  // استخراج عنوان الصفحة الفرعية
  let pageTitle = "مأرب إيفنتس";
  let pageSubtitle = "";

  if (pathname === "/explore") {
    pageTitle = "استكشف القاعات";
    pageSubtitle = "القاعات والمنشآت المعتمدة";
  } else if (pathname === "/my-bookings") {
    pageTitle = "حجوزاتي";
    pageSubtitle = "متابعة وإدارة الحجوزات";
  } else if (pathname === "/account") {
    pageTitle = "حسابي";
    pageSubtitle = "الملف الشخصي والإعدادات";
  } else if (pathname === "/favorites") {
    pageTitle = "المفضلة";
    pageSubtitle = "قاعاتك المحفوظة";
  } else if (pathname.startsWith("/venues/")) {
    pageTitle = "تفاصيل القاعة";
    pageSubtitle = "معاينة وحجز الفترات";
  }

  return (
    <header className="h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shadow-xs transition-colors duration-200">
      {/* القسم الأيمن: الشعار والاسم (أو زر العودة مع عنوان الصفحة) */}
      <div className="flex items-center gap-2.5 shrink-0">
        {isHome ? (
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xl shadow-xs shrink-0 group-hover:scale-105 transition">
              م
            </div>
            <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              مأرب إيفنتس
            </span>
          </Link>
        ) : (
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95"
              aria-label="العودة للرئيسية"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-black text-sm sm:text-base tracking-tight text-slate-900 dark:text-white leading-tight">
                {pageTitle}
              </h1>
              {pageSubtitle && (
                <p className="text-[10px] text-slate-400 font-medium leading-none">
                  {pageSubtitle}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* المنتصف: كبسولة الموقع في الصفحة الرئيسية */}
      {isHome && (
        <div className="hidden min-[370px]:flex bg-slate-100/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-full items-center gap-1.5 text-center shadow-2xs">
          <Pin3D className="w-3.5 h-3.5 shrink-0" />
          <div className="text-right">
            <div className="text-[9px] text-slate-400 font-medium leading-none">
              موقعك الحالي
            </div>
            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
              مأرب، اليمن
            </div>
          </div>
        </div>
      )}

      {/* القسم الأيسر: الإضاءة والإشعارات بشكل موحد وثابت دائمًا */}
      <div className="flex items-center gap-1.5 shrink-0">
        <ThemeToggle />
        <NotificationPopover />
      </div>
    </header>
  );
}
