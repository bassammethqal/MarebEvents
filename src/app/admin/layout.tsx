import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import { InstallAppPrompt } from "@/components/pwa/InstallAppPrompt";

export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "";

  // استثناء صفحة تسجيل دخول الإدارة حتى تفتح بحرية بدون فرض الحارس مع إظهار إشعار التثبيت
  if (pathname.includes("/admin/login")) {
    return (
      <>
        {children}
        <InstallAppPrompt variant="admin" />
      </>
    );
  }

  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-amber-500/20 bg-slate-900/80 px-6 py-3 text-xs text-amber-300 font-semibold flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>لوحة تحكم مدير النظام (Admin Only) - حماية الخادم مفعلة</span>
        </div>
        <span className="text-slate-400 font-mono text-[11px]">مأرب إيفنتس</span>
      </header>
      <main className="p-4 sm:p-6">{children}</main>
      <InstallAppPrompt variant="admin" />
    </div>
  );
}
