"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Coins,
  Settings,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit3,
  Sun,
  Moon,
  Clock,
  PlusCircle,
} from "lucide-react";
import { updateOwnerVenueSettingsAction } from "@/lib/owner/actions";
import { CreateVenueModal, CategoryOption } from "./CreateVenueModal";
import Link from "next/link";

export interface VenueDetailItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  district: string;
  city: string;
  maxCapacity: number;
  morningPrice: number;
  eveningPrice: number;
  fullDayPrice: number;
}

interface OwnerVenuesClientProps {
  venues: VenueDetailItem[];
  categories: CategoryOption[];
}

export function OwnerVenuesClient({
  venues: initialVenues,
  categories,
}: OwnerVenuesClientProps) {
  const router = useRouter();
  const [venues, setVenues] = useState<VenueDetailItem[]>(initialVenues);
  const [editingVenue, setEditingVenue] = useState<VenueDetailItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // فورم التعديل
  const [formCapacity, setFormCapacity] = useState(0);
  const [formMorningPrice, setFormMorningPrice] = useState(0);
  const [formEveningPrice, setFormEveningPrice] = useState(0);
  const [formFullDayPrice, setFormFullDayPrice] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);

  const openEditModal = (venue: VenueDetailItem) => {
    setEditingVenue(venue);
    setFormCapacity(venue.maxCapacity);
    setFormMorningPrice(venue.morningPrice);
    setFormEveningPrice(venue.eveningPrice);
    setFormFullDayPrice(venue.fullDayPrice);
    setFormIsActive(venue.status === "active");
    setFeedback(null);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingVenue) return;

    setIsSaving(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("venueId", editingVenue.id);
    formData.append("maxCapacity", formCapacity.toString());
    formData.append("morningPrice", formMorningPrice.toString());
    formData.append("eveningPrice", formEveningPrice.toString());
    formData.append("fullDayPrice", formFullDayPrice.toString());
    formData.append("isActive", formIsActive ? "true" : "false");

    const res = await updateOwnerVenueSettingsAction(formData);

    if (res.success) {
      setVenues((prev) =>
        prev.map((v) =>
          v.id === editingVenue.id
            ? {
                ...v,
                maxCapacity: formCapacity,
                morningPrice: formMorningPrice,
                eveningPrice: formEveningPrice,
                fullDayPrice: formFullDayPrice,
                status: formIsActive ? "active" : "suspended",
              }
            : v
        )
      );
      setFeedback({
        type: "success",
        message: `تم تحديث بيانات وأسعار (${editingVenue.name}) بنجاح!`,
      });
      setEditingVenue(null);
      router.refresh();
    } else {
      setFeedback({
        type: "error",
        message: res.error || "فشل حفظ التعديلات.",
      });
    }

    setIsSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Action: Add New Venue Button */}
      <button
        onClick={() => setCreateModalOpen(true)}
        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-md shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
      >
        <PlusCircle className="w-4 h-4" />
        <span>+ إضافة منشأة جديدة</span>
      </button>

      {feedback && (
        <div
          className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Venues List or Empty State */}
      {venues.length === 0 ? (
        <div className="bg-white/80 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              لم تسجل أي منشأة بعد
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-[260px] mx-auto">
              اضغط على زر &quot;إضافة منشأة جديدة&quot; أعلاه لتسجيل قاعتك أو استراحتك والبدء في استقبال الحجوزات.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {venues.map((venue) => {
            const isActive = venue.status === "active";

            return (
              <div
                key={venue.id}
                className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm hover:shadow transition-all space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        {venue.name}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-800 dark:text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        {isActive ? "نشط ومتاح" : "معلّق مؤقتاً"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      مأرب - {venue.district}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/venues/${venue.slug}`}
                      target="_blank"
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
                      title="معاينة الصفحة العامة"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => openEditModal(venue)}
                      className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-500/20 text-xs font-bold transition active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>
                  </div>
                </div>

                {/* Pricing & Capacity Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400">السعة القصوى</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {venue.maxCapacity} شخص
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-indigo-700 dark:text-indigo-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400">الفترة المسائية</div>
                      <div className="font-bold text-indigo-800 dark:text-indigo-400">
                        {venue.eveningPrice.toLocaleString()} ر.ي
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/40">
                    <Sun className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400">الفترة الصباحية</div>
                      <div className="font-bold text-amber-800 dark:text-amber-400">
                        {venue.morningPrice.toLocaleString()} ر.ي
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/40">
                    <Clock className="w-4 h-4 text-purple-700 dark:text-purple-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400">يوم كامل</div>
                      <div className="font-bold text-purple-800 dark:text-purple-400">
                        {venue.fullDayPrice.toLocaleString()} ر.ي
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingVenue && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                تعديل إعدادات وأسعار المنشأة
              </h3>
              <button
                onClick={() => setEditingVenue(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  السعة القصوى (عدد الضيوف)
                </label>
                <input
                  type="number"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    سعر المسائية (ر.ي)
                  </label>
                  <input
                    type="number"
                    value={formEveningPrice}
                    onChange={(e) => setFormEveningPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    سعر الصباحية (ر.ي)
                  </label>
                  <input
                    type="number"
                    value={formMorningPrice}
                    onChange={(e) => setFormMorningPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  سعر اليوم الكامل (ر.ي)
                </label>
                <input
                  type="number"
                  value={formFullDayPrice}
                  onChange={(e) => setFormFullDayPrice(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Status Switch */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    استقبال الحجوزات
                  </div>
                  <div className="text-[10px] text-slate-400">
                    تفعيل أو إيقاف ظهور المنشأة للحجز
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    formIsActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      formIsActive ? "translate-x-0" : "-translate-x-6"
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>حفظ التعديلات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingVenue(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Venue Modal */}
      <CreateVenueModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        categories={categories}
      />
    </div>
  );
}
