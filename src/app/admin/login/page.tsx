"use client";

import { useState } from "react";
import { loginAction } from "@/lib/auth/actions";
import { LoggedOutAlert } from "@/components/auth/LoggedOutAlert";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowRight, Lock, KeyRound } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result.success) {
      if (result.data?.role !== "admin") {
        setError("هذا الحساب لا يملك صلاحيات مدير عام المنصة. يرجى الدخول بحساب الإدارة المعتمد.");
        setLoading(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } else {
      setError(result.error || "فشل تسجيل الدخول. تحقق من بيانات الدخول.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-amber-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-red-500/10 blur-3xl" />

      <div className="w-full max-w-md bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl shadow-amber-500/10 relative z-10 text-right">
        {/* Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block group mb-3">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
              م
            </div>
          </Link>
          <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 px-3 py-1 rounded-full text-amber-400 text-xs font-bold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>لوحة الإدارة والتحكم الشاملة</span>
          </div>
          <h1 className="text-2xl font-black text-white">تسجيل دخول الإدارة</h1>
          <p className="text-xs text-slate-400 mt-1">
            بوابة الإدارة العليا لمنصة فعاليات مأرب
          </p>
        </div>

        <LoggedOutAlert />

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              البريد الإلكتروني للإدارة أو رقم الهاتف
            </label>
            <input
              type="text"
              name="identifier"
              required
              placeholder="admin@marebevents.com أو 773461637"
              className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              كلمة المرور
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "جاري التحقق من الصلاحيات..." : "تسجيل الدخول إلى لوحة الإدارة"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800 text-center space-y-2">
          <div className="text-[11px] text-slate-500">
            هذا المسار مخصص لإدارة المنصة ومدراء النظام فقط.
          </div>
          <div>
            <Link
              href="/"
              className="text-[11px] text-slate-400 hover:text-slate-200 transition inline-flex items-center gap-1"
            >
              <ArrowRight className="w-3 h-3" />
              <span>العودة إلى الصفحة الرئيسية</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
