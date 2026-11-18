"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, CalendarCheck, User } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  // If in admin or owner portals, hide the customer bottom navigation
  if (pathname.startsWith("/admin") || pathname.startsWith("/owner")) {
    return null;
  }

  const navItems = [
    {
      name: "الرئيسية",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      name: "اكتشف",
      href: "/#venues",
      icon: Compass,
      isActive: pathname.startsWith("/venues") || pathname.startsWith("/categories"),
    },
    {
      name: "حجوزاتي",
      href: "/my-bookings",
      icon: CalendarCheck,
      isActive: pathname.startsWith("/my-bookings"),
    },
    {
      name: "حسابي",
      href: "/account",
      icon: User,
      isActive: pathname.startsWith("/account") || pathname.startsWith("/login"),
    },
  ];

  return (
    <nav
      aria-label="التنقل السفلي للتطبيق"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 transition-all duration-300 pb-[env(safe-area-inset-bottom,8px)] shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
    >
      <div className="grid grid-cols-4 h-18 w-full items-center px-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 py-1 ${
                item.isActive
                  ? "text-amber-700 dark:text-amber-400 font-bold"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <div
                className={`relative flex items-center justify-center w-10 h-8 rounded-2xl transition-all duration-200 ${
                  item.isActive ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : ""
                }`}
              >
                <Icon className={`w-5 h-5 ${item.isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
              </div>
              <span className="text-[11px] tracking-tight">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
