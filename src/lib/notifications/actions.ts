"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { db, schema } from "@/db";
import { eq, desc, and } from "drizzle-orm";
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

    const rows = await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, session.user.id))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(20);

    const formattedRows: UserNotification[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      message: r.message,
      type: r.type,
      is_read: r.isRead ? 1 : 0,
      action_url: r.actionUrl,
      created_at: r.createdAt,
    }));

    const unreadCount = formattedRows.filter((n) => !n.is_read).length;

    return {
      success: true,
      authenticated: true,
      unreadCount,
      notifications: formattedRows,
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

    await db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(schema.notifications.id, notificationId),
          eq(schema.notifications.userId, session.user.id)
        )
      );

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

    await db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(eq(schema.notifications.userId, session.user.id));

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to mark all notifications read:", error);
    return { success: false, error: "تعذر تحديث الإشعارات" };
  }
}
