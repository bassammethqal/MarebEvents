"use client";

import { useState } from "react";
import {
  toggleVenueStatusAction,
  deleteVenueAction,
} from "@/lib/admin/venue-actions";
import {
  Building2,
  ExternalLink,
  Power,
  Trash2,
  Users,
  AlertTriangle,
  Check,
} from "lucide-react";
import Link from "next/link";

export interface AdminVenueRow {
  id: string;
  name: string;
  slug: string;
  city: string;
  district: string;
  status: string;
  categoryName: string | null;
  maxCapacity: number | null;
  startingPrice: number | null;
  currency: string;
  coverImage: string | null;
  ownerName: string | null;
}

interface VenuesManagementTableProps {
  initialVenues: AdminVenueRow[];
}

export function VenuesManagementTable({ initialVenues }: VenuesManagementTableProps) {
  const [venues, setVenues] = useState<AdminVenueRow[]>(initialVenues);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleToggleStatus(venue: AdminVenueRow) {
    setBusyId(venue.id);
    const res = await toggleVenueStatusAction(venue.id, venue.status);
    if (res.success && res.data) {
      setVenues((prev) =>
        prev.map((v) => (v.id === venue.id ? { ...v, status: res.data!.newStatus } : v))
      );
    }
    setBusyId(null);
  }

  async function handleDelete(venueId: string) {
    setBusyId(venueId);
    const res = await deleteVenueAction(venueId);
    if (res.success) {
      setVenues((prev) => prev.filter((v) => v.id !== venueId));
      setConfirmDeleteId(null);
    }
    setBusyId(null);
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-black text-white">إدارة المنشآت والقاعات المسجلة</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            عرض كافة المنشآت مع إمكانية المعاينة، تفعيل أو إيقاف الحجز، وحذف المنشآت التجريبية
          </p>
        </div>
        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
          {venues.length} منشأة
        </span>
      </div>

      {venues.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          لا توجد منشآت مسجلة حالياً. استخدم النموذج أعلاه لإنشاء أول منشأة.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold">
                <th className="pb-3 pr-2">المنشأة</th>
                <th className="pb-3 pr-2">التصنيف</th>
                <th className="pb-3 pr-2">السعة والأسعار</th>
                <th className="pb-3 pr-2">المالك المسؤول</th>
                <th className="pb-3 pr-2">الحالة</th>
                <th className="pb-3 pr-2 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {venues.map((venue) => {
                const isActive = venue.status === "active";
                const isBusy = busyId === venue.id;

                return (
                  <tr key={venue.id} className="hover:bg-slate-800/30 transition">
                    {/* Venue Image + Name */}
                    <td className="py-3.5 pr-2">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            venue.coverImage ||
                            "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=150&q=80"
                          }
                          alt={venue.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-800"
                        />
                        <div>
                          <div className="font-bold text-white text-sm hover:text-amber-400 transition">
                            <Link href={`/venues/${venue.slug}`} target="_blank">
                              {venue.name}
                            </Link>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {venue.city} - {venue.district}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 pr-2 text-slate-300">
                      <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-slate-700/50">
                        {venue.categoryName || "عام"}
                      </span>
                    </td>

                    {/* Capacity & Price */}
                    <td className="py-3.5 pr-2">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>حتى {venue.maxCapacity || 0} ضيف</span>
                      </div>
                      <div className="font-bold text-amber-400 mt-0.5">
                        {venue.startingPrice
                          ? `${venue.startingPrice.toLocaleString("ar-YE")} ${venue.currency}`
                          : "حسب الفترة"}
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="py-3.5 pr-2 text-[11px]">
                      {venue.ownerName ? (
                        <span className="text-slate-300 font-semibold">{venue.ownerName}</span>
                      ) : (
                        <span className="text-slate-500">غير مرتبط</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 pr-2">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>نشط ومعتمد</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <span>موقوف مؤقتاً</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Preview */}
                        <Link
                          href={`/venues/${venue.slug}`}
                          target="_blank"
                          title="معاينة في الموقع"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        {/* Toggle Status */}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleStatus(venue)}
                          title={isActive ? "إيقاف الحجز مؤقتاً" : "إعادة التفعيل"}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            isActive
                              ? "bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400"
                              : "bg-emerald-950/60 hover:bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        {confirmDeleteId === venue.id ? (
                          <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-lg border border-rose-500/40">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDelete(venue.id)}
                              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition cursor-pointer"
                            >
                              تأكيد
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] hover:text-white cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setConfirmDeleteId(venue.id)}
                            title="حذف المنشأة"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
