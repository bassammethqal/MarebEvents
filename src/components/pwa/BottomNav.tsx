"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home3D, Explore3D, Bookings3D, Account3D } from "@/components/ui/Icons3D";

function getIndexFromPath(pathname: string): number {
  if (pathname.startsWith("/explore") || pathname.startsWith("/venues") || pathname.startsWith("/categories")) {
    return 1;
  } else if (pathname.startsWith("/my-bookings")) {
    return 2;
  } else if (pathname.startsWith("/account") || pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return 3;
  }
  return 0;
}

export function BottomNav() {
  const pathname = usePathname();
  const currentActualIndex = getIndexFromPath(pathname);
  const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null);

  // Sync optimistic index whenever actual pathname updates
  useEffect(() => {
    setOptimisticIndex(null);
  }, [pathname]);

  // If in admin or owner portals, hide the customer bottom navigation
  if (pathname.startsWith("/admin") || pathname.startsWith("/owner")) {
    return null;
  }

  const activeIndex = optimisticIndex !== null ? optimisticIndex : currentActualIndex;

  const navItems = [
    {
      name: "الرئيسية",
      href: "/",
      icon: Home3D,
      index: 0,
    },
    {
      name: "اكتشف",
      href: "/explore",
      icon: Explore3D,
      index: 1,
    },
    {
      name: "حجوزاتي",
      href: "/my-bookings",
      icon: Bookings3D,
      index: 2,
    },
    {
      name: "حسابي",
      href: "/account",
      icon: Account3D,
      index: 3,
    },
  ];

  return (
    <nav
      aria-label="التنقل السفلي للتطبيق"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[406px] z-40 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_12px_32px_rgba(15,23,42,0.12)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all duration-300"
    >
      <div className="relative grid grid-cols-4 h-16 w-full items-center p-1.5">
        {/* مؤشر الخلفية المنزلق فيزيائياً بنعومة ومرونة استجابة فورية 0ms */}
        <div
          aria-hidden="true"
          className="absolute top-1.5 bottom-1.5 rounded-2xl bg-gradient-to-b from-amber-500/18 to-amber-500/5 dark:from-amber-400/25 dark:to-amber-500/10 border border-amber-500/30 dark:border-amber-400/40 shadow-[0_4px_16px_rgba(245,158,11,0.2)] pointer-events-none transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            width: "calc(25% - 8px)",
            right: `calc(${activeIndex * 25}% + 4px)`,
          }}
        />

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeIndex === item.index;

          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              onClick={() => setOptimisticIndex(item.index)}
              className={`relative z-10 flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 active:scale-95 ${
                isActive
                  ? "text-amber-800 dark:text-amber-300 font-black"
                  : "text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <div
                className={`relative flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? "-translate-y-0.5 scale-110 drop-shadow-[0_4px_8px_rgba(245,158,11,0.35)]"
                    : "opacity-75 hover:opacity-100"
                }`}
              >
                <Icon className="w-6 h-6" active={isActive} />
              </div>
              <span className="text-[11px] tracking-tight">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
