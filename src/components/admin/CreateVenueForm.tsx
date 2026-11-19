"use client";

import { useState } from "react";
import { createVenueByAdminAction } from "@/lib/admin/venue-actions";
import {
  Building2,
  Sparkles,
  MapPin,
  Users,
  Banknote,
  Image as ImageIcon,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

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

interface CreateVenueFormProps {
  categories: CategoryOption[];
  owners: OwnerOption[];
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
    name: "استراحة كلاسيكية فخمة",
    url: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
  },
];

export function CreateVenueForm({ categories, owners }: CreateVenueFormProps) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [district, setDistrict] = useState("حي الروضة");
  const [addressDetails, setAddressDetails] = useState("");
  const [description, setDescription] = useState("");
  const [maxCapacity, setMaxCapacity] = useState(350);
  const [coverImageUrl, setCoverImageUrl] = useState(PRESET_COVERS[0].url);
  const [eveningPrice, setEveningPrice] = useState("180000");
  const [morningPrice, setMorningPrice] = useState("100000");
  const [fullDayPrice, setFullDayPrice] = useState("250000");
  const [ownerUserId, setOwnerUserId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdVenue, setCreatedVenue] = useState<{
    venueId: string;
    name: string;
    slug: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("categoryId", categoryId);
    formData.append("district", district);
    formData.append("addressDetails", addressDetails);
    formData.append("description", description);
    formData.append("maxCapacity", maxCapacity.toString());
    formData.append("coverImageUrl", coverImageUrl);
    formData.append("eveningPrice", eveningPrice);
    if (morningPrice) formData.append("morningPrice", morningPrice);
    if (fullDayPrice) formData.append("fullDayPrice", fullDayPrice);
    if (ownerUserId) formData.append("ownerUserId", ownerUserId);

    const res = await createVenueByAdminAction(formData);

    if (res.success && res.data) {
      setCreatedVenue(res.data);
      // Reset form
      setName("");
      setDescription("");
      setAddressDetails("");
      setLoading(false);
    } else {
      setError(res.error || "فشل إنشاء المنشأة.");
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-right">
      <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>نظام إدارة المنشآت</span>
          </div>
          <h2 className="text-xl font-black text-white">إضافة منشأة / قاعة جديدة من الصفر</h2>
          <p className="text-xs text-slate-400 mt-1">
            إنشاء القاعة، وحدات الحجز، أسعار الفترات، وتفعيلها فوراً للحجز المباشر
          </p>
        </div>

        <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <Building2 className="w-6 h-6" />
        </div>
      </div>

      {createdVenue && (
        <div className="mb-6 p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-sm text-emerald-300">
              <Check className="w-5 h-5 text-emerald-400" />
              <span>تم إنشاء المنشأة بنجاح وتفعيلها في محرك البحث والحجز!</span>
            </div>
            <button
              type="button"
              onClick={() => setCreatedVenue(null)}
              className="text-xs text-emerald-400/80 hover:text-emerald-300 underline"
            >
              إغلاق
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 p-4 rounded-xl border border-emerald-500/20 text-xs text-slate-300">
            <div>
              <span className="text-slate-400">اسم المنشأة:</span>{" "}
              <strong className="text-white text-sm">{createdVenue.name}</strong>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                المعرف: {createdVenue.slug}
              </div>
            </div>

            <Link
              href={`/venues/${createdVenue.slug}`}
              target="_blank"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition text-xs shadow-xs"
            >
              <span>معاينة صفحة القاعة</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Row 1: Name and Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              اسم المنشأة / القاعة <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: قصر الملكة للمناسبات"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              التصنيف <span className="text-rose-400">*</span>
            </label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.nameAr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: District, Capacity, and Optional Owner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              الحي / المنطقة في مأرب <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="مثال: حي الروضة"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              السعة القصوى للضيوف <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              required
              min={10}
              max={5000}
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(parseInt(e.target.value, 10) || 0)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              ربط بمالك مسجل <span className="text-slate-500 text-[11px]">(اختياري)</span>
            </label>
            <select
              value={ownerUserId}
              onChange={(e) => setOwnerUserId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition cursor-pointer"
            >
              <option value="">-- بدون تعيين مالك حالياً --</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id} className="bg-slate-900 text-white">
                  {o.fullName} ({o.phone || o.email || "بدون هاتف"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Pricing for shifts (YER) */}
        <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <Banknote className="w-4 h-4" />
            <span>جدول الأسعار المعتمد (بالريال اليمني YER)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                الفترة المسائية (الأساسية) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                required
                value={eveningPrice}
                onChange={(e) => setEveningPrice(e.target.value)}
                placeholder="180000"
                className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-amber-400 font-bold text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                الفترة الصباحية (اختياري)
              </label>
              <input
                type="number"
                value={morningPrice}
                onChange={(e) => setMorningPrice(e.target.value)}
                placeholder="100000"
                className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                فترة يوم كامل (اختياري)
              </label>
              <input
                type="number"
                value={fullDayPrice}
                onChange={(e) => setFullDayPrice(e.target.value)}
                placeholder="250000"
                className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition"
              />
            </div>
          </div>
        </div>

        {/* Row 4: Cover Image Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>الصورة الرئيسية للمنشأة</span>
            </span>
            <span className="text-[11px] text-slate-500">اختر من النماذج الجاهزة أو ضع رابطاً مخصصاً</span>
          </label>

          <div className="grid grid-cols-3 gap-2 mb-2">
            {PRESET_COVERS.map((preset) => (
              <button
                key={preset.url}
                type="button"
                onClick={() => setCoverImageUrl(preset.url)}
                className={`text-right p-2 rounded-xl border text-[11px] transition flex items-center gap-2 cursor-pointer ${
                  coverImageUrl === preset.url
                    ? "border-amber-400 bg-amber-500/10 text-amber-300 font-bold"
                    : "border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preset.url}
                  alt={preset.name}
                  className="w-8 h-8 rounded-lg object-cover shrink-0"
                />
                <span className="truncate">{preset.name}</span>
              </button>
            ))}
          </div>

          <input
            type="url"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 transition text-left"
            dir="ltr"
          />
        </div>

        {/* Row 5: Description & Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              تفاصيل العنوان / المعالم القريبة
            </label>
            <input
              type="text"
              value={addressDetails}
              onChange={(e) => setAddressDetails(e.target.value)}
              placeholder="مثال: الشارع العام، بجوار فندق بلقيس"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              وصف مختصر للمنشأة
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: قاعة مناسبات مجهزة بأحدث أنظمة الإضاءة والتكييف المركزي"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "جاري إنشاء المنشأة وتفعيلها..." : "إنشاء المنشأة واعتمادها فوراً"}
          </button>
        </div>
      </form>
    </div>
  );
}
