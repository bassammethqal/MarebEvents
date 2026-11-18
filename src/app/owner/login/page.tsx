"use client";

import { useState } from "react";
import { loginAction } from "@/lib/auth/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, ShieldCheck, ArrowRight } from "lucide-react";

export default function OwnerLoginPage() {
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
      if (result.data?.role === "customer") {
        setError("هذا الحساب لا يملك صلاحية إدارة المنشآت. يرجى الدخول من بوابة الزبائن.");
        setLoading(false);
        return;
      }
      router.push("/owner");
      router.refresh();
    } else {
      setError(result.error || "فشل تسجيل الدخول. تحقق من بياناتك.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-amber-600/10 blur-3xl" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative z-10 text-right">
        {/* Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block group mb-3">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
              م
            </div>
          </Link>
          <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 px-3 py-1 rounded-full text-amber-400 text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>بوابة الملاك والإدارة</span>
          </div>
          <h1 className="text-2xl font-black text-white">تسجيل دخول أصحاب المنشآت</h1>
          <p className="text-xs text-slate-400 mt-1">
            إدارة الحجوزات، المواعيد، وجداول الأسعار للقاعات والشاليهات
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              البريد الإلكتروني أو رقم الهاتف المعتمد
            </label>
            <input
              type="text"
              name="identifier"
              required
              placeholder="770000000 أو name@example.com"
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
            {loading ? "جاري التحقق من الصلاحيات..." : "تسجيل الدخول للوحة التحكم"}
          </button>
        </form>

        {/* Info & WhatsApp Contact Box */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-center space-y-3">
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            حسابات أصحاب القاعات والاستراحات تُنشأ وتُعتمد عبر إدارة المنصة
          </p>

          <a
            href="https://wa.me/967773461637"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-2xl bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition active:scale-95"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>طلب اعتماد منشأة جديدة عبر واتساب: 773461637</span>
          </a>

          <div className="pt-2">
            <Link
              href="/"
              className="text-[11px] text-slate-500 hover:text-slate-300 transition inline-flex items-center gap-1"
            >
              <ArrowRight className="w-3 h-3" />
              <span>العودة إلى الصفحة الرئيسية للمنصة</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
