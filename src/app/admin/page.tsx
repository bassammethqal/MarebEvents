import { requireAdmin } from "@/lib/auth/guards";
import { client } from "@/db";
import { CreateOwnerForm } from "@/components/admin/CreateOwnerForm";
import Link from "next/link";
import {
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";

export const instant = false;

interface VenueOption {
  id: string;
  name: string;
  city: string;
  district: string;
}

interface OwnerMemberRow {
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  venueName: string;
  role: string;
  mustChangePassword: boolean;
  createdAt: string;
}

async function getAdminData() {
  const venues = await client<VenueOption[]>`
    SELECT id, name, city, district
    FROM venues
    WHERE status = 'active'
    ORDER BY name ASC
  `;

  const ownerMembers = await client<OwnerMemberRow[]>`
    SELECT 
      u.id as "userId",
      u.full_name as "fullName",
      u.email,
      u.phone,
      u.must_change_password as "mustChangePassword",
      v.name as "venueName",
      vm.role,
      vm.created_at as "createdAt"
    FROM venue_members vm
    JOIN users u ON u.id = vm.user_id
    JOIN venues v ON v.id = vm.venue_id
    ORDER BY vm.created_at DESC
  `;

  return { venues, ownerMembers };
}

export default async function AdminPage() {
  const { user } = await requireAdmin();
  const { venues, ownerMembers } = await getAdminData();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                لوحة الإدارة والتحكم الشاملة
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              أهلاً بك، {user.fullName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              إدارة حسابات ملاك المنشآت، تعيين كلمات المرور المؤقتة، ومتابعة تفعيل القاعات
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/owner"
              className="text-xs font-bold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-2 rounded-xl transition inline-flex items-center gap-1.5"
            >
              <span>لوحة المالك</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/"
              className="text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 px-3.5 py-2 rounded-xl transition"
            >
              عرض المنصة
            </Link>
          </div>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">إجمالي المنشآت النشطة</div>
              <div className="text-xl font-black text-white">{venues.length}</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">حسابات الملاك المعتمدة</div>
              <div className="text-xl font-black text-white">{ownerMembers.length}</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">حسابات غيّرت الرمز المؤقت</div>
              <div className="text-xl font-black text-white">
                {ownerMembers.filter((m) => !m.mustChangePassword).length}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Create Owner Account Form */}
        <section>
          <CreateOwnerForm venues={venues} />
        </section>

        {/* Section 2: Provisioned Owners List */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-black text-white">حسابات الملاك المرتبطة بالمنشآت</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                قائمة بجميع الملاك الذين تم تزويدهم بحسابات رسمية وحالة تفعيلهم
              </p>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              {ownerMembers.length} مالك
            </span>
          </div>

          {ownerMembers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              لم يتم إنشاء أي حساب مالك بعد. استخدم النموذج أعلاه لإنشاء أول حساب.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold">
                    <th className="pb-3 pr-2">اسم المالك</th>
                    <th className="pb-3 pr-2">المنشأة المرتبطة</th>
                    <th className="pb-3 pr-2">رقم الهاتف / البريد</th>
                    <th className="pb-3 pr-2">حالة كلمة المرور</th>
                    <th className="pb-3 pr-2">الدور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {ownerMembers.map((m) => (
                    <tr key={m.userId} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 pr-2 font-bold text-white">
                        {m.fullName}
                      </td>
                      <td className="py-3.5 pr-2 text-amber-400 font-semibold">
                        {m.venueName}
                      </td>
                      <td className="py-3.5 pr-2 font-mono text-[11px] text-slate-400">
                        {m.phone || m.email || "—"}
                      </td>
                      <td className="py-3.5 pr-2">
                        {m.mustChangePassword ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            <span>بانتظار تغيير الرمز</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>مفعل ومؤمن</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pr-2">
                        <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                          {m.role === "primary_owner" ? "مالك رئيسي" : m.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
