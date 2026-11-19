"use client";

import { useState } from "react";
import { Building2, Sparkles, PlusCircle } from "lucide-react";
import { CreateVenueModal, CategoryOption } from "./CreateVenueModal";

interface OwnerOnboardingCardProps {
  categories: CategoryOption[];
}

export function OwnerOnboardingCard({ categories }: OwnerOnboardingCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 p-5 sm:p-6 text-right space-y-4 shadow-lg shadow-amber-500/5">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <Building2 className="w-6 h-6" />
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
            <Sparkles className="w-3 h-3" />
            خطوة أولى
          </span>
        </div>

        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
            أضف منشأتك الأولى للبدء في استقبال الحجوزات
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
            مرحباً بك في منصة مأرب إيفنتس! لم تقم بإضافة أي قاعة أو استراحة تابعة لك بعد.
            أدخل اسم قاعتك، موقعها، سعتها، وأسعار فتراتها لتظهر لآلاف الزبائن في مأرب وتبدأ في استقبال الطلبات فوراً.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-md shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ إضافة منشأتي الأولى الآن</span>
        </button>
      </div>

      <CreateVenueModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={categories}
      />
    </>
  );
}
