"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2 } from "lucide-react";

function AlertContent() {
  const searchParams = useSearchParams();
  const isLoggedOut = searchParams.get("logged_out") === "1";

  if (!isLoggedOut) return null;

  return (
    <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-center gap-2 font-bold animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      <span>تم تسجيل خروجك بنجاح</span>
    </div>
  );
}

export function LoggedOutAlert() {
  return (
    <Suspense fallback={null}>
      <AlertContent />
    </Suspense>
  );
}
