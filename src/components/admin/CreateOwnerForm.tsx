"use client";

import { useState } from "react";
import { createOwnerByAdminAction } from "@/lib/auth/actions";
import {
  UserPlus,
  Key,
  Copy,
  Check,
  Building,
  RefreshCw,
  Phone,
  Mail,
  User,
  ShieldCheck,
  AlertCircle,
  Share2,
} from "lucide-react";

interface VenueOption {
  id: string;
  name: string;
  city: string;
  district: string;
}

interface CreateOwnerFormProps {
  venues: VenueOption[];
}

function generateSecureTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let pwd = "M@";
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export function CreateOwnerForm({ venues }: CreateOwnerFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tempPassword, setTempPassword] = useState(generateSecureTempPassword());
  const [venueId, setVenueId] = useState(venues[0]?.id || "");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdData, setCreatedData] = useState<{
    fullName: string;
    identifier: string;
    tempPassword: string;
    venueName: string;
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
    formData.append("venueId", venueId);

    const res = await createOwnerByAdminAction(formData);

    if (res.success && res.data) {
      const selectedVenue = venues.find((v) => v.id === venueId);
      setCreatedData({
        fullName,
        identifier: phone || email,
        tempPassword,
        venueName: selectedVenue ? selectedVenue.name : "المنشأة",
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
          <h2 className="text-xl font-black text-white">إضافة مالك منشأة جديد</h2>
          <p className="text-xs text-slate-400 mt-1">
            إنشاء حساب معتمد برقم الهاتف/البريد وكلمة مرور مؤقتة، وإجباره على تغييرها عند أول دخول
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
              <span>تم إنشاء حساب المالك وربطه بالمنشأة بنجاح!</span>
            </div>
            <button
              type="button"
              onClick={() => setCreatedData(null)}
              className="text-xs text-emerald-400/80 hover:text-emerald-300 underline"
            >
              إغلاق الإشعار
            </button>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-500/20 space-y-2 text-xs text-slate-300 font-mono">
            <p>
              <strong className="text-slate-400 font-sans">الاسم:</strong> {createdData.fullName}
            </p>
            <p>
              <strong className="text-slate-400 font-sans">المنشأة:</strong> {createdData.venueName}
            </p>
            <p>
              <strong className="text-slate-400 font-sans">بيانات الدخول:</strong> {createdData.identifier}
            </p>
            <div className="flex items-center justify-between pt-1">
              <span>
                <strong className="text-slate-400 font-sans">كلمة المرور المؤقتة:</strong>{" "}
                <span className="text-amber-400 font-bold">{createdData.tempPassword}</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopyPassword(createdData.tempPassword)}
                className="inline-flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded-lg transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "تم النسخ" : "نسخ الرمز"}</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-emerald-400/90 font-medium">
            * سيُطلب من المالك تلقائياً تعيين كلمة مرور جديدة وخاصة به بمجرد تسجيل الدخول في{" "}
            <code className="text-amber-400">/owner/login</code>.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>الاسم الكامل لمالك المنشأة</span>
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: صالح محمد المرادي"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* Venue Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>المنشأة المراد ربطه بها</span>
              <span className="text-rose-400">*</span>
            </label>
            <select
              required
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition cursor-pointer"
            >
              {venues.length === 0 ? (
                <option value="">لا توجد منشآت نشطة</option>
              ) : (
                venues.map((venue) => (
                  <option key={venue.id} value={venue.id} className="bg-slate-900 text-white">
                    {venue.name} ({venue.city} - {venue.district})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>رقم الهاتف المعتمد</span>
              <span className="text-slate-500 text-[11px]">(مفضل للدخول السريع)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="مثال: 773461637"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition text-left"
              dir="ltr"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>البريد الإلكتروني</span>
              <span className="text-slate-500 text-[11px]">(اختياري)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@example.com"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition text-left"
              dir="ltr"
            />
          </div>
        </div>

        {/* Temporary Password with Generator & Copy */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>كلمة المرور المؤقتة (Temporary Password)</span>
              <span className="text-rose-400">*</span>
            </span>
            <span className="text-[11px] text-amber-400 font-mono">
              سيُجبر على تغييرها فور أول تسجيل دخول
            </span>
          </label>

          <div className="flex items-center gap-2">
            <input
              type="text"
              required
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-amber-400 font-mono font-bold text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition text-left"
              dir="ltr"
            />
            <button
              type="button"
              onClick={handleGenerateNewPassword}
              title="توليد كلمة مرور أخرى"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleCopyPassword()}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "تم النسخ" : "نسخ"}</span>
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || venues.length === 0}
            className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "جاري إنشاء الحساب وربط المنشأة..." : "إنشاء حساب المالك وتعيين كلمة المرور المؤقتة"}
          </button>
        </div>
      </form>
    </div>
  );
}
