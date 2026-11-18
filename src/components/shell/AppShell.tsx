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
    <div className="min-h-screen w-full bg-[#060913] text-slate-100 flex justify-center selection:bg-amber-500/20 selection:text-amber-300">
      <PwaRegister />
      <div className="w-full max-w-[430px] mx-auto min-h-screen bg-slate-950 border-x border-slate-800/80 shadow-2xl relative pb-20 flex flex-col overflow-x-hidden">
        {children}
        <BottomNav />
      </div>
    </div>
  );
}
