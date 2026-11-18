"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, CalendarCheck, Heart, User } from "lucide-react";

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
      name: "التصنيفات",
      href: "/#categories",
      icon: Compass,
      isActive: pathname.startsWith("/categories") || pathname.startsWith("/venues"),
    },
    {
      name: "حجوزاتي",
      href: "/my-bookings",
      icon: CalendarCheck,
      isActive: pathname.startsWith("/my-bookings"),
    },
    {
      name: "المفضلة",
      href: "/favorites",
      icon: Heart,
      isActive: pathname.startsWith("/favorites"),
    },
    {
      name: "حسابي",
      href: "/login",
      icon: User,
      isActive: pathname.startsWith("/login") || pathname.startsWith("/account"),
    },
  ];

  return (
    <nav
      aria-label="التنقل السفلي للتطبيق"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 transition-all duration-300 pb-[env(safe-area-inset-bottom,8px)]"
    >
      <div className="grid grid-cols-5 h-16 w-full items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 transition-colors duration-200 py-1 ${
                item.isActive ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div
                className={`relative flex items-center justify-center w-9 h-7 rounded-xl transition ${
                  item.isActive ? "bg-amber-500/15 text-amber-400" : ""
                }`}
              >
                <Icon className={`w-5 h-5 ${item.isActive ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                {item.isActive && (
                  <span className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
              <span className="text-[10px] tracking-tight">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
