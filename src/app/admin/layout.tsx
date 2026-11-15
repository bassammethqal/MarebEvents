import { requireAdmin } from "@/lib/auth/guards";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch {
    redirect("/login?next=/admin");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-red-500/20 bg-red-950/20 px-6 py-3 text-xs text-red-300 font-semibold flex items-center justify-between">
        <span>لوحة تحكم مدير النظام (Admin Only) - حماية الخادم مفعلة</span>
        <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
