"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { sqlite } from "@/db";
import { revalidatePath } from "next/cache";

export async function toggleFavoriteAction(venueId: string): Promise<{
  success: boolean;
  authenticated: boolean;
  favorited?: boolean;
  error?: string;
}> {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return {
        success: false,
        authenticated: false,
        error: "يرجى تسجيل الدخول لإضافة المنشأة للمفضلة",
      };
    }

    const userId = session.user.id;

    // Check if favorite exists
    const existing = sqlite
      .prepare(`SELECT id FROM favorites WHERE user_id = ? AND venue_id = ?`)
      .get(userId, venueId) as { id: string } | undefined;

    if (existing) {
      sqlite
        .prepare(`DELETE FROM favorites WHERE id = ?`)
        .run(existing.id);

      revalidatePath("/");
      revalidatePath("/favorites");
      return {
        success: true,
        authenticated: true,
        favorited: false,
      };
    } else {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      sqlite
        .prepare(
          `INSERT INTO favorites (id, user_id, venue_id, created_at) VALUES (?, ?, ?, ?)`
        )
        .run(id, userId, venueId, now);

      revalidatePath("/");
      revalidatePath("/favorites");
      return {
        success: true,
        authenticated: true,
        favorited: true,
      };
    }
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    return {
      success: false,
      authenticated: true,
      error: "حدث خطأ أثناء تحديث المفضلة",
    };
  }
}

export async function getUserFavoriteIds(userId?: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const rows = sqlite
      .prepare(`SELECT venue_id FROM favorites WHERE user_id = ?`)
      .all(userId) as { venue_id: string }[];
    return rows.map((r) => r.venue_id);
  } catch (error) {
    console.error("Failed to get favorite IDs:", error);
    return [];
  }
}
