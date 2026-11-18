"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { sqlite } from "@/db";
import { revalidatePath } from "next/cache";

export interface UserNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: number;
  action_url: string | null;
  created_at: string;
}

export async function getUserNotificationsAction(): Promise<{
  success: boolean;
  authenticated: boolean;
  unreadCount: number;
  notifications: UserNotification[];
}> {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return {
        success: true,
        authenticated: false,
        unreadCount: 0,
        notifications: [],
      };
    }

    const rows = sqlite
      .prepare(
        `SELECT id, title, message, type, is_read, action_url, created_at 
         FROM notifications 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT 20`
      )
      .all(session.user.id) as UserNotification[];

    const unreadCount = rows.filter((n) => !n.is_read).length;

    return {
      success: true,
      authenticated: true,
      unreadCount,
      notifications: rows,
    };
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return {
      success: false,
      authenticated: false,
      unreadCount: 0,
      notifications: [],
    };
  }
}

export async function markNotificationReadAction(notificationId: string) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) return { success: false, error: "غير مصرح" };

    sqlite
      .prepare(
        `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`
      )
      .run(notificationId, session.user.id);

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to mark notification read:", error);
    return { success: false, error: "تعذر تحديث الإشعار" };
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const session = await getCurrentSession();
    if (!session?.user) return { success: false, error: "غير مصرح" };

    sqlite
      .prepare(
        `UPDATE notifications SET is_read = 1 WHERE user_id = ?`
      )
      .run(session.user.id);

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to mark all notifications read:", error);
    return { success: false, error: "تعذر تحديث الإشعارات" };
  }
}
