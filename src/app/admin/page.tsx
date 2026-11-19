import { requireAdmin } from "@/lib/auth/guards";
import { client } from "@/db";
import { logoutAction } from "@/lib/auth/actions";
import { CreateOwnerForm } from "@/components/admin/CreateOwnerForm";
import { CreateVenueForm } from "@/components/admin/CreateVenueForm";
import {
  VenuesManagementTable,
  AdminVenueRow,
} from "@/components/admin/VenuesManagementTable";
import Link from "next/link";
import {
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  LogOut,
  Sparkles,
} from "lucide-react";

export const instant = false;

interface VenueOption {
  id: string;
  name: string;
  city: string;
  district: string;
}

interface CategoryOption {
  id: string;
  nameAr: string;
}

interface OwnerOption {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
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
  const [categories, venues, allVenues, owners, ownerMembers] = await Promise.all([
    client<CategoryOption[]>`
      SELECT id, name_ar as "nameAr"
      FROM venue_categories
      ORDER BY display_order ASC
    `,

    client<VenueOption[]>`
      SELECT id, name, city, district
      FROM venues
      WHERE status = 'active'
      ORDER BY name ASC
    `,

    client<AdminVenueRow[]>`
      SELECT 
        v.id,
        v.name,
        v.slug,
        v.city,
        v.district,
        v.status,
        v.default_currency as "currency",
        c.name_ar as "categoryName",
        (SELECT image_url FROM venue_images WHERE venue_id = v.id AND is_cover = true LIMIT 1) as "coverImage",
        (SELECT capacity_max FROM venue_units WHERE venue_id = v.id ORDER BY capacity_max DESC LIMIT 1) as "maxCapacity",
        (SELECT MIN(price) FROM pricing_tiers WHERE venue_id = v.id AND shift = 'evening') as "startingPrice",
        (
          SELECT u.full_name 
          FROM venue_members vm 
          JOIN users u ON u.id = vm.user_id 
          WHERE vm.venue_id = v.id AND vm.role = 'primary_owner' 
          LIMIT 1
        ) as "ownerName"
      FROM venues v
      LEFT JOIN venue_categories c ON c.id = v.category_id
      ORDER BY v.created_at DESC
    `,

    client<OwnerOption[]>`
      SELECT id, full_name as "fullName", phone, email
      FROM users
      WHERE role = 'owner'
      ORDER BY full_name ASC
    `,

    client<OwnerMemberRow[]>`
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
    `,
  ]);

  return { categories, venues, allVenues, owners, ownerMembers };
}

export default async function AdminPage() {
  const { user } = await requireAdmin();
  const { categories, venues, allVenues, owners, ownerMembers } = await getAdminData();

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
              إدارة المنشآت والقاعات، إضافة ملاك المنشآت، ومتابعة تفعيل الحجوزات في مأرب
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
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-xs font-bold text-rose-400 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/50 px-3.5 py-2 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج</span>
              </button>
            </form>
          </div>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">إجمالي المنشآت</div>
              <div className="text-xl font-black text-white">{allVenues.length}</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">منشآت نشطة ومعتمدة</div>
              <div className="text-xl font-black text-white">
                {allVenues.filter((v) => v.status === "active").length}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">حسابات الملاك</div>
              <div className="text-xl font-black text-white">{ownerMembers.length}</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">ملاك مفعّلون ومؤمنون</div>
              <div className="text-xl font-black text-white">
                {ownerMembers.filter((m) => !m.mustChangePassword).length}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Create New Venue from Scratch */}
        <section>
          <CreateVenueForm categories={categories} owners={owners} />
        </section>

        {/* Section 2: Create Owner Account Form (with + new venue option) */}
        <section>
          <CreateOwnerForm venues={venues} categories={categories} />
        </section>

        {/* Section 3: Registered Venues Management Table */}
        <section>
          <VenuesManagementTable initialVenues={allVenues} />
        </section>

        {/* Section 4: Provisioned Owners List */}
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
