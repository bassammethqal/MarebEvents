"use client";

import { useState, useOptimistic, useTransition } from "react";
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
  Check,
  Loader2,
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

type VenueAction =
  | { type: "TOGGLE_STATUS"; id: string }
  | { type: "DELETE"; id: string };

export function VenuesManagementTable({ initialVenues }: VenuesManagementTableProps) {
  const [venues, setVenues] = useState<AdminVenueRow[]>(initialVenues);
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [optimisticVenues, setOptimisticVenues] = useOptimistic(
    venues,
    (state, action: VenueAction) => {
      switch (action.type) {
        case "TOGGLE_STATUS":
          return state.map((v) =>
            v.id === action.id
              ? { ...v, status: v.status === "active" ? "suspended" : "active" }
              : v
          );
        case "DELETE":
          return state.filter((v) => v.id !== action.id);
        default:
          return state;
      }
    }
  );

  function handleToggleStatus(venue: AdminVenueRow) {
    setBusyId(venue.id);
    startTransition(async () => {
      setOptimisticVenues({ type: "TOGGLE_STATUS", id: venue.id });
      const res = await toggleVenueStatusAction(venue.id, venue.status);
      if (res.success && res.data) {
        setVenues((prev) =>
          prev.map((v) => (v.id === venue.id ? { ...v, status: res.data!.newStatus } : v))
        );
      } else {
        setVenues((prev) => [...prev]);
      }
      setBusyId(null);
    });
  }

  function handleDelete(venueId: string) {
    setBusyId(venueId);
    setConfirmDeleteId(null);
    startTransition(async () => {
      setOptimisticVenues({ type: "DELETE", id: venueId });
      const res = await deleteVenueAction(venueId);
      if (res.success) {
        setVenues((prev) => prev.filter((v) => v.id !== venueId));
      } else {
        setVenues((prev) => [...prev]);
      }
      setBusyId(null);
    });
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-black text-white">إدارة المنشآت والقاعات المسجلة</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            عرض كافة المنشآت مع إمكانية المعاينة، تفعيل أو إيقاف الحجز، وحذف المنشآت التجريبية لحظياً
          </p>
        </div>
        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
          {optimisticVenues.length} منشأة
        </span>
      </div>

      {optimisticVenues.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          لا توجد منشآت مسجلة حالياً.
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
              {optimisticVenues.map((venue) => {
                const isActive = venue.status === "active";
                const isBusy = busyId === venue.id;

                return (
                  <tr key={venue.id} className="hover:bg-slate-800/40 transition">
                    {/* Venue Name & Cover */}
                    <td className="py-3.5 pr-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                          {venue.coverImage ? (
                            <img
                              src={venue.coverImage}
                              alt={venue.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-500">
                              <Building2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{venue.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {venue.city} - {venue.district}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 pr-2">
                      <span className="text-slate-300 font-medium">
                        {venue.categoryName || "غير محدد"}
                      </span>
                    </td>

                    {/* Capacity & Price */}
                    <td className="py-3.5 pr-2">
                      <div className="space-y-0.5">
                        <div className="text-slate-300">
                          السعة: <strong className="text-white">{venue.maxCapacity || "—"}</strong>
                        </div>
                        <div className="text-amber-400 font-bold">
                          {venue.startingPrice
                            ? `${venue.startingPrice.toLocaleString()} ${venue.currency}`
                            : "غير محدد"}
                        </div>
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="py-3.5 pr-2">
                      <div className="inline-flex items-center gap-1.5 text-slate-300">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{venue.ownerName || "غير مربوط بمالك"}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 pr-2">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" />
                          <span>نشط ومتاح</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
                          <span>معلّق مؤقتاً</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-2 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Preview Public Page */}
                        <Link
                          href={`/venues/${venue.slug}`}
                          prefetch={true}
                          target="_blank"
                          title="معاينة الصفحة العامة"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        {/* Toggle Status */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(venue)}
                          disabled={isBusy}
                          title={isActive ? "تعليق المنشأة" : "تفعيل المنشأة"}
                          className={`p-1.5 rounded-lg border transition cursor-pointer disabled:opacity-50 ${
                            isActive
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                          }`}
                        >
                          {isBusy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Power className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Delete Button */}
                        {confirmDeleteId === venue.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDelete(venue.id)}
                              disabled={isBusy}
                              className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition cursor-pointer"
                            >
                              {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : "تأكيد"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] transition cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(venue.id)}
                            title="حذف المنشأة"
                            className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-900/40 text-rose-400 hover:bg-rose-900/60 transition cursor-pointer"
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
