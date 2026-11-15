import { requireOwnerOrAdmin } from "@/lib/auth/guards";

export const instant = false;

export default async function OwnerPage() {
  const { user } = await requireOwnerOrAdmin();

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-white mb-2">أهلاً بك، {user.fullName}</h1>
      <p className="text-sm text-slate-400">
        لوحة إدارة القاعات والاستراحات. الصلاحية الحالية:{" "}
        <span className="text-amber-400 font-semibold">{user.role}</span>.
      </p>
    </div>
  );
}
