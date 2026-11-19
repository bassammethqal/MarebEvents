"use client";

import { useState } from "react";
import { createOwnerByAdminAction } from "@/lib/auth/actions";
import {
  UserPlus,
  Key,
  Copy,
  Check,
  RefreshCw,
  Phone,
  Mail,
  User,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from "lucide-react";

function generateSecureTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let pwd = "M@";
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export function CreateOwnerForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tempPassword, setTempPassword] = useState(generateSecureTempPassword());

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdData, setCreatedData] = useState<{
    fullName: string;
    identifier: string;
    tempPassword: string;
  } | null>(null);

  function handleGenerateNewPassword() {
    const pwd = generateSecureTempPassword();
    setTempPassword(pwd);
    setCopied(false);
  }

  async function handleCopyPassword(textToCopy?: string) {
    const text = textToCopy || tempPassword;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("fullName", fullName);
    if (email.trim()) formData.append("email", email.trim());
    if (phone.trim()) formData.append("phone", phone.trim());
    formData.append("tempPassword", tempPassword);

    const res = await createOwnerByAdminAction(formData);

    if (res.success && res.data) {
      setCreatedData({
        fullName,
        identifier: phone || email,
        tempPassword,
      });

      // Reset form
      setFullName("");
      setEmail("");
      setPhone("");
      setTempPassword(generateSecureTempPassword());
      setLoading(false);
    } else {
      setError(res.error || "فشل إنشاء الحساب.");
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-right">
      <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>لوحة تحكم الإدارة</span>
          </div>
          <h2 className="text-xl font-black text-white">إضافة حساب مالك جديد</h2>
          <p className="text-xs text-slate-400 mt-1">
            إنشاء حساب المالك بكلمة مرور مؤقتة، ويقوم المالك بنفسه بعد تسجيل الدخول بإضافة بيانات منشأته
          </p>
        </div>

        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <UserPlus className="w-6 h-6" />
        </div>
      </div>

      {createdData && (
        <div className="mb-6 p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-sm text-emerald-300">
              <Check className="w-5 h-5 text-emerald-400" />
              <span>تم إنشاء حساب المالك بنجاح! جاهز للإرسال للمالك:</span>
            </div>
            <button
              type="button"
              onClick={() => setCreatedData(null)}
              className="text-xs text-emerald-400/80 hover:text-emerald-300 underline cursor-pointer"
            >
              إغلاق الإشعار
            </button>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-500/20 space-y-2 text-xs text-slate-300 font-mono">
            <p>
              <strong className="text-slate-400 font-sans">الاسم:</strong> {createdData.fullName}
            </p>
            <p>
              <strong className="text-slate-400 font-sans">اسم المستخدم / المعرف:</strong> {createdData.identifier}
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <p>
                <strong className="text-slate-400 font-sans">كلمة المرور المؤقتة:</strong>{" "}
                <span className="text-amber-400 font-bold">{createdData.tempPassword}</span>
              </p>
              <button
                type="button"
                onClick={() =>
                  handleCopyPassword(
                    `بيانات حسابك في مأرب إيفنتس:\nالاسم: ${createdData.fullName}\nالمعرف: ${createdData.identifier}\nكلمة المرور المؤقتة: ${createdData.tempPassword}\nرابط الدخول: https://marebevents.com/owner/login`
                  )
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-sans font-bold transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ الرسالة بالكامل</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-emerald-400/90 font-sans">
            * سيُطلب من المالك تلقائياً تعيين كلمة مرور جديدة خاصة به عند أول تسجيل دخول له من `/owner/login`.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              الاسم الكامل للمالك <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: يحيى صالح المرادي"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl py-2.5 pr-10 pl-3 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition"
              />
              <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              رقم الهاتف (الأساسي لتسجيل الدخول)
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="77XXXXXXX أو 71XXXXXXX"
                dir="ltr"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl py-2.5 pr-10 pl-3 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition text-right"
              />
              <Phone className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              البريد الإلكتروني (اختياري)
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@example.com"
                dir="ltr"
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl py-2.5 pr-10 pl-3 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition text-right"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
            </div>
          </div>
        </div>

        {/* Temporary Password */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            كلمة المرور المؤقتة (الأولية) <span className="text-rose-400">*</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                required
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl py-2.5 pr-10 pl-3 text-xs font-mono text-amber-400 font-bold outline-none transition"
              />
              <Key className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
            </div>
            <button
              type="button"
              onClick={handleGenerateNewPassword}
              title="توليد كلمة مرور عشوائية جديدة"
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">توليد جديد</span>
            </button>
            <button
              type="button"
              onClick={() => handleCopyPassword()}
              title="نسخ كلمة المرور"
              className="px-3 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "تم النسخ" : "نسخ"}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            * يتم تشفير هذه الكلمة عبر خوارزمية Argon2id، وسيتم إلزام المالك بتغييرها فور تسجيل دخوله.
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm shadow-lg shadow-amber-500/20 transition active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري إنشاء الحساب...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>إنشاء حساب المالك</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
