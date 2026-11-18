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
    <div className="min-h-screen w-full bg-[#EEF2F6] flex justify-center selection:bg-amber-500/20 selection:text-amber-800">
      <PwaRegister />
      <div className="w-full max-w-[430px] mx-auto min-h-screen bg-[#F8FAFC] text-slate-900 shadow-[0_0_50px_rgba(15,23,42,0.08)] relative pb-24 overflow-x-hidden flex flex-col">
        {children}
        <BottomNav />
      </div>
    </div>
  );
}
