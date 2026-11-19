"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationPopover } from "@/components/ui/NotificationPopover";
import { LogoutButton } from "@/components/auth/LogoutButton";

export function OwnerTopAppBar() {
  const pathname = usePathname();

  // لا يظهر في صفحة تسجيل الدخول للمالك
  if (pathname.includes("/owner/login")) {
    return null;
  }

  const isRoot = pathname === "/owner";

  let title = "لوحة تحكم المالك";
  let subtitle = "إدارة المنشآت والحجوزات";

  if (pathname === "/owner/venues") {
    title = "إدارة المنشآت";
    subtitle = "تعديل الأسعار والبيانات والسعة";
  } else if (pathname === "/owner/bookings") {
    title = "سجل الحجوزات";
    subtitle = "متابعة وإدارة وتصفية الطلبات";
  } else if (pathname === "/owner/calendar") {
    title = "التقويم والجدولة";
    subtitle = "الحجوزات اليدوية وإغلاق الصيانة";
  }

  return (
    <header className="h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 px-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-200">
      {/* القسم الأيمن */}
      <div className="flex items-center gap-2.5 shrink-0">
        {isRoot ? (
          <Link href="/owner" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center text-xl shadow-xs shrink-0 group-hover:scale-105 transition">
              م
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                  إدارة المنشآت
                </span>
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  معتمد
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">لوحة المالك الرسمية</p>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/owner"
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition active:scale-95"
              aria-label="العودة للوحة المالك"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                {title}
              </h1>
              <p className="text-[10px] text-slate-400 font-medium leading-none">{subtitle}</p>
            </div>
          </div>
        )}
      </div>

      {/* القسم الأيسر: الإضاءة، الإشعارات، وزر تسجيل الخروج */}
      <div className="flex items-center gap-1.5 shrink-0">
        <ThemeToggle />
        <NotificationPopover />
        <LogoutButton variant="icon" />
      </div>
    </header>
  );
}
