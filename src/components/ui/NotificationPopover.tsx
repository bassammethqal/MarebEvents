"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, CheckCheck, X, Sparkles, AlertCircle, Calendar } from "lucide-react";
import {
  getUserNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  UserNotification,
} from "@/lib/notifications/actions";

export function NotificationPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ignore = false;
    async function loadInitial() {
      try {
        const res = await getUserNotificationsAction();
        if (!ignore) {
          setAuthenticated(res.authenticated);
          setUnreadCount(res.unreadCount);
          setNotifications(res.notifications);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadInitial();
    return () => {
      ignore = true;
    };
  }, []);

  const refreshNotifications = async () => {
    try {
      setLoading(true);
      const res = await getUserNotificationsAction();
      setAuthenticated(res.authenticated);
      setUnreadCount(res.unreadCount);
      setNotifications(res.notifications);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await markNotificationReadAction(id);
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnreadCount(0);
    await markAllNotificationsReadAction();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "booking_status":
        return <Calendar className="w-4 h-4 text-amber-500" />;
      case "payment":
        return <Sparkles className="w-4 h-4 text-emerald-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) refreshNotifications();
        }}
        aria-label="التنبيهات"
        aria-expanded={isOpen}
        className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs relative active:scale-95"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-88 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden text-right transition animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">الإشعارات</h3>
              {unreadCount > 0 && (
                <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount} جديد
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1 font-semibold px-2 py-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                  title="تعليم الكل كمقروء"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>تحديد كمقروء</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="إغلاق"
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {authenticated === false ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-amber-600 dark:text-amber-400">
                  <Bell className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
                  سجل دخولك لتصلك الإشعارات
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  تابع تحديثات حجوزاتك، تأكيد المواعيد، والعروض الخاصة أولاً بأول.
                </p>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="inline-block w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition"
                >
                  تسجيل الدخول الآن
                </Link>
              </div>
            ) : loading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                جاري تحميل التنبيهات...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  لا توجد إشعارات حالياً
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  سنخبرك بأي جديد بخصوص حجوزاتك ومناسباتك هنا.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.is_read) handleMarkAsRead(item.id);
                  }}
                  className={`p-3.5 flex gap-3 items-start transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                    !item.is_read ? "bg-amber-50/40 dark:bg-amber-950/20" : ""
                  }`}
                >
                  <div className="mt-0.5 w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {item.title}
                      </span>
                      {!item.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                      {item.message}
                    </p>
                    {item.action_url && (
                      <Link
                        href={item.action_url}
                        onClick={() => setIsOpen(false)}
                        className="inline-block mt-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400"
                      >
                        عرض التفاصيل ←
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
