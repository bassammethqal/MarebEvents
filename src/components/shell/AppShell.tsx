"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/pwa/BottomNav";
import { PwaRegister } from "@/components/pwa/PwaRegister";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/admin") || pathname.startsWith("/owner");

  if (isDashboard) {
    return <div className="min-h-screen w-full bg-slate-950 text-slate-100">{children}</div>;
  }

  return (
    <div className="min-h-screen w-full bg-[#EEF2F6] dark:bg-slate-950 flex justify-center selection:bg-amber-500/20 selection:text-amber-800 transition-colors duration-200">
      <PwaRegister />
      <div className="w-full max-w-[430px] mx-auto min-h-screen bg-[#F8FAFC] dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-[0_0_50px_rgba(15,23,42,0.08)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] border-x border-transparent dark:border-slate-800/80 relative pb-24 overflow-x-hidden flex flex-col transition-colors duration-200">
        {children}
        <BottomNav />
      </div>
    </div>
  );
}
