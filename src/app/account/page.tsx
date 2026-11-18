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
          className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
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
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition" />
          </div>
        </Link>

        <Link
          href="/favorites"
          className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
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
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition" />
          </div>
        </Link>
      </div>

      {/* 3. Contact & Technical Support Card */}
      <div className="mb-5">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 px-1">
          التواصل والدعم الفني
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {/* WhatsApp Support */}
          <a
            href="https://wa.me/967773461637"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">واتساب الدعم المباشر</div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold dir-ltr">
                  773461637
                </div>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition" />
          </a>

          {/* Instagram Account */}
          <a
            href="https://instagram.com/bassam.methqal"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">حساب إنستغرام</div>
                <div className="text-[11px] text-pink-600 dark:text-pink-400 font-medium dir-ltr">
                  @bassam.methqal
                </div>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition" />
          </a>

          {/* Email Support */}
          <a
            href="mailto:maribevents12@gmail.com"
            className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-white">البريد الإلكتروني</div>
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">
                  maribevents12@gmail.com
                </div>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition" />
          </a>
        </div>
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
          className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 active:scale-95 border border-rose-200/60 dark:border-rose-900/40 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج من الحساب</span>
        </button>
      </form>
    </div>
  );
}
