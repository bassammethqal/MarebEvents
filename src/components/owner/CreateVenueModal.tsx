"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Sparkles,
  MapPin,
  Users,
  Coins,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  FileText,
} from "lucide-react";
import { createVenueByOwnerAction } from "@/lib/owner/actions";

export interface CategoryOption {
  id: string;
  nameAr: string;
}

interface CreateVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryOption[];
}

const PRESET_COVERS = [
  {
    name: "قاعة أفراح ملكية",
    url: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "شاليه ومنتجع حديث",
    url: "https://images.unsplash.com/photo-1545232979-fbf68fe9b10d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "استراحة راقية",
    url: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
  },
];

export function CreateVenueModal({ isOpen, onClose, categories }: CreateVenueModalProps) {
  const router = useRouter();

  const [nameAr, setNameAr] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [district, setDistrict] = useState("حي الروضة");
  const [addressAr, setAddressAr] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("350");
  const [coverImageUrl, setCoverImageUrl] = useState(PRESET_COVERS[0].url);
  const [eveningPrice, setEveningPrice] = useState("180000");
  const [morningPrice, setMorningPrice] = useState("100000");
  const [fullDayPrice, setFullDayPrice] = useState("250000");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("nameAr", nameAr.trim());
    formData.append("categoryId", categoryId || (categories[0]?.id || ""));
    formData.append("district", district.trim());
    formData.append("addressAr", addressAr.trim());
    formData.append("descriptionAr", descriptionAr.trim());
    formData.append("maxCapacity", maxCapacity);
    formData.append("coverImageUrl", coverImageUrl.trim());
    formData.append("eveningPrice", eveningPrice);
    formData.append("morningPrice", morningPrice);
    formData.append("fullDayPrice", fullDayPrice);

    const res = await createVenueByOwnerAction(formData);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        router.refresh();
      }, 1000);
    } else {
      setError(res.error || "فشل إضافة المنشأة. يرجى المحاولة مجدداً.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl text-right space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                إضافة منشأة / قاعة جديدة
              </h3>
              <p className="text-[11px] text-slate-400">
                أدخل تفاصيل وأسعار قاعتك للبدء في استقبال الحجوزات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-xs flex items-center gap-2 font-bold animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>تم إضافة منشأتك بنجاح وهي جاهزة ومتاحة الآن! 🎉</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Name & Category */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              اسم المنشأة / القاعة بالعربية <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: قاعة قصر الملوك الكبرى"
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                التصنيف <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                الحي / المنطقة بمأرب <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="مثال: حي الروضة"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* Capacity & Address */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                السعة القصوى (شخص) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                placeholder="350"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                العنوان التفصيلي
              </label>
              <input
                type="text"
                value={addressAr}
                onChange={(e) => setAddressAr(e.target.value)}
                placeholder="بجوار مدرسة... / شارع الأربعين"
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              وصف مختصر للمنشأة
            </label>
            <textarea
              value={descriptionAr}
              onChange={(e) => setDescriptionAr(e.target.value)}
              placeholder="قاعة فخمة مجهزة بأحدث الديكورات ونظام إضاءة وصوت متكامل..."
              rows={2}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {/* Pricing Tiers */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-2">
            <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
              <Coins className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              الأسعار بالريال اليمني (YER)
            </span>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  الفترة المسائية *
                </label>
                <input
                  type="number"
                  required
                  value={eveningPrice}
                  onChange={(e) => setEveningPrice(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  الفترة الصباحية
                </label>
                <input
                  type="number"
                  value={morningPrice}
                  onChange={(e) => setMorningPrice(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  اليوم الكامل
                </label>
                <input
                  type="number"
                  value={fullDayPrice}
                  onChange={(e) => setFullDayPrice(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Cover Image Presets */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              صورة الواجهة الرئيسية
            </label>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {PRESET_COVERS.map((preset) => (
                <button
                  type="button"
                  key={preset.url}
                  onClick={() => setCoverImageUrl(preset.url)}
                  className={`relative p-1 rounded-xl border transition overflow-hidden text-right ${
                    coverImageUrl === preset.url
                      ? "border-amber-500 ring-2 ring-amber-500/30"
                      : "border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.name}
                    className="w-full h-12 object-cover rounded-lg"
                  />
                  <div className="text-[9px] font-semibold text-slate-600 dark:text-slate-300 truncate mt-1">
                    {preset.name}
                  </div>
                </button>
              ))}
            </div>

            <input
              type="url"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="أو ألصق رابط صورة أخرى..."
              className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[11px] outline-none"
              dir="ltr"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إضافة المنشأة...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>حفظ وإضافة المنشأة</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
