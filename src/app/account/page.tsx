import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";
import { sqlite } from "@/db";
import {
  Phone,
  Mail,
  CalendarCheck,
  Heart,
  MessageCircle,
  LogOut,
  ChevronLeft,
  Smartphone,
} from "lucide-react";

export const instant = false;

export default async function AccountPage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login?next=/account");
  }

  const user = session.user;

  // Count user bookings
  let bookingsCount = 0;
  try {
    const row = sqlite
      .prepare(`SELECT COUNT(*) as count FROM bookings WHERE customer_id = ?`)
      .get(user.id) as { count: number } | undefined;
    bookingsCount = row?.count || 0;
  } catch {
    bookingsCount = 0;
  }

  // Count user favorites
  let favoritesCount = 0;
  try {
    const row = sqlite
      .prepare(`SELECT COUNT(*) as count FROM favorites WHERE user_id = ?`)
      .get(user.id) as { count: number } | undefined;
    favoritesCount = row?.count || 0;
  } catch {
    favoritesCount = 0;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <h1 className="text-xl font-black">حسابي</h1>
        <Link
          href="/"
          className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline"
        >
          الرئيسية
        </Link>
      </div>

      {/* User Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs mb-5">
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-xs shrink-0">
            {user.fullName.trim()[0] || "م"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-base truncate">{user.fullName}</h2>
              <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                عميل معتمد
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">عضو في منصة مأرب إيفنتس</p>
          </div>
        </div>

        <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Phone className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-mono dir-ltr">{user.phone}</span>
          </div>
          {user.email && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Options */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden mb-5 divide-y divide-slate-100 dark:divide-slate-800">
        <Link
          href="/my-bookings"
          className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">حجوزاتي</div>
              <div className="text-[10px] text-slate-400">متابعة الحجوزات وحالة الطلبات</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">
              {bookingsCount}
            </span>
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </div>
        </Link>

        <Link
          href="/favorites"
          className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 fill-rose-500/20" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">القاعات المفضلة</div>
              <div className="text-[10px] text-slate-400">المنشآت المحفوظة للرجوع السريع</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">
              {favoritesCount}
            </span>
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </div>
        </Link>

        <a
          href="https://wa.me/967777123456"
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">خدمة العملاء والدعم</div>
              <div className="text-[10px] text-slate-400">تواصل مباشر عبر الواتساب على مدار الساعة</div>
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-slate-400" />
        </a>
      </div>

      {/* App Info Box */}
      <div className="bg-slate-100 dark:bg-slate-900/50 rounded-2xl p-4 mb-6 text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
          <Smartphone className="w-4 h-4 text-amber-600" />
          <span>تطبيق مأرب إيفنتس الذكي (PWA v2.0)</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          حجز فوري، منع تعارض ذري 100%، وتجربة محلية مخصصة لمحافظة مأرب.
        </p>
      </div>

      {/* Logout Button */}
      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 active:scale-95 border border-rose-200/60 dark:border-rose-900/40"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج من الحساب</span>
        </button>
      </form>
    </div>
  );
}
