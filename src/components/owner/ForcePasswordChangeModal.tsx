"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeFirstLoginPasswordChangeAction } from "@/lib/auth/actions";
import { KeyRound, ShieldAlert, CheckCircle2, Lock, Eye, EyeOff } from "lucide-react";

interface ForcePasswordChangeModalProps {
  userFullName?: string;
}

export function ForcePasswordChangeModal({ userFullName }: ForcePasswordChangeModalProps) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("كلمة المرور يجب أن لا تقل عن 8 خانات.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("newPassword", newPassword);
    formData.append("confirmPassword", confirmPassword);

    const result = await completeFirstLoginPasswordChangeAction(formData);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        router.refresh();
      }, 800);
    } else {
      setError(result.error || "فشل تحديث كلمة المرور. حاول مجدداً.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-500/10 text-right animate-in fade-in zoom-in-95 duration-200">
        {/* Header Badge */}
        <div className="text-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <KeyRound className="w-7 h-7" />
          </div>

          <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 px-3 py-1 rounded-full text-amber-400 text-xs font-bold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>إجراء أمني إلزامي</span>
          </div>

          <h2 className="text-xl font-black text-white">
            تعيين كلمة مرور جديدة لحسابك
          </h2>
          {userFullName && (
            <p className="text-xs text-amber-400/90 font-medium mt-1">
              أهلاً بك، {userFullName}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            هذا أول تسجيل دخول لك باستخدام كلمة المرور المؤقتة التي زوّدتك بها إدارة المنصة.
            لضمان أمان حسابك ومنشأتك، يرجى تعيين كلمة مرور شخصية جديدة للاستمرار.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-semibold">
            {error}
          </div>
        )}

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-emerald-400">
              تم تحديث كلمة المرور بنجاح!
            </h3>
            <p className="text-xs text-slate-400">
              جاري فتح لوحة التحكم الخاصة بمنشأتك...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                كلمة المرور الجديدة (8 خانات على الأقل)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pl-10 rounded-2xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="تبديل إظهار كلمة المرور"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                تأكيد كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pl-10 rounded-2xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition"
                  dir="ltr"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60">
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${newPassword.length >= 8 ? "bg-emerald-400" : "bg-slate-600"}`} />
                <span>تحتوي على 8 خانات أو أكثر</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${newPassword && newPassword === confirmPassword ? "bg-emerald-400" : "bg-slate-600"}`} />
                <span>تطابق كلمتي المرور</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "جاري الحفظ والتأمين..." : "حفظ كلمة المرور ومتابعة الدخول"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
