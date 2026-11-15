import { requireOwnerOrAdmin } from "@/lib/auth/guards";
import { redirect } from "next/navigation";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireOwnerOrAdmin();
  } catch {
    redirect("/login?next=/owner");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-amber-500/20 bg-amber-950/20 px-6 py-3 text-xs text-amber-300 font-semibold flex items-center justify-between">
        <span>لوحة تحكم مالك المنشأة (Owner/Admin) - حماية الخادم مفعلة</span>
        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
