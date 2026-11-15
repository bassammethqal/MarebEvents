import { requireAdmin } from "@/lib/auth/guards";

export const instant = false;

export default async function AdminPage() {
  const { user } = await requireAdmin();

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-white mb-2">أهلاً بك، {user.fullName}</h1>
      <p className="text-sm text-slate-400">
        أنت في مسار آمن ومحمي بنسبة 100% داخل الخادم. الصلاحية الحالية:{" "}
        <span className="text-amber-400 font-semibold">{user.role}</span>.
      </p>
    </div>
  );
}
