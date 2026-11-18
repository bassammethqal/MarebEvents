"use client";

import { useState } from "react";
import { registerAction } from "@/lib/auth/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("role", "customer");

    const result = await registerAction(formData);

    if (result.success) {
      router.push("/");
      router.refresh();
    } else {
      setError(result.error || "فشل إنشاء الحساب");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 backdrop-blur-md shadow-2xl relative z-10 text-right">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-black text-slate-950 text-2xl shadow-lg shadow-amber-500/20 mb-3">
              M
            </div>
            <h1 className="text-2xl font-bold text-white">إنشاء حساب زبون جديد</h1>
            <p className="text-xs text-slate-400 mt-1">انضم إلى منصة فعاليات مأرب لحجز قاعات الأفراح والمناسبات</p>
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              الاسم الكامل
            </label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="مثال: محمد علي العرادة"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              رقم الهاتف (للتواصل وتأكيد الحجز)
            </label>
            <input
              type="tel"
              name="phone"
              required
              placeholder="770000000"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              البريد الإلكتروني (اختياري)
            </label>
            <input
              type="email"
              name="email"
              placeholder="name@example.com"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              كلمة المرور (8 خانات على الأقل)
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-lg shadow-amber-400/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "جاري إنشاء الحساب..." : "إنشاء حساب زبون"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-amber-400 font-semibold hover:underline">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
