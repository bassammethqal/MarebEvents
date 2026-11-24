import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireOwnerOrAdmin } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import { ForcePasswordChangeModal } from "@/components/owner/ForcePasswordChangeModal";
import { OwnerBottomNav } from "@/components/owner/OwnerBottomNav";
import { OwnerTopAppBar } from "@/components/owner/OwnerTopAppBar";
import { InstallAppPrompt } from "@/components/pwa/InstallAppPrompt";

export const instant = false;

export const metadata: Metadata = {
  manifest: "/owner/manifest.webmanifest",
};

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";

  // إذا كان المسار هو صفحة تسجيل الدخول، اعرضها مباشرة دون فرض الجلسة أو الشريط مع إظهار إشعار التثبيت
  if (pathname.includes("/owner/login")) {
    return (
      <>
        {children}
        <InstallAppPrompt variant="owner" />
      </>
    );
  }

  let user;
  try {
    const auth = await requireOwnerOrAdmin();
    user = auth.user;
  } catch {
    redirect("/owner/login");
  }

  return (
    <div className="min-h-screen w-full bg-[#EEF2F6] dark:bg-slate-950 flex justify-center selection:bg-amber-500/20 selection:text-amber-800 transition-colors duration-200">
      {user.mustChangePassword && (
        <ForcePasswordChangeModal userFullName={user.fullName} />
      )}
      <div className="w-full max-w-[430px] mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-[0_0_50px_rgba(15,23,42,0.08)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] border-x border-transparent dark:border-slate-800/80 relative pb-24 overflow-x-hidden flex flex-col transition-colors duration-200">
        <OwnerTopAppBar />
        {children}
        <InstallAppPrompt variant="owner" />
        <OwnerBottomNav />
      </div>
    </div>
  );
}
