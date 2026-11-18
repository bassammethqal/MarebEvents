"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";
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
    const [existing] = await db
      .select({ id: schema.favorites.id })
      .from(schema.favorites)
      .where(
        and(
          eq(schema.favorites.userId, userId),
          eq(schema.favorites.venueId, venueId)
        )
      );

    if (existing) {
      await db
        .delete(schema.favorites)
        .where(eq(schema.favorites.id, existing.id));

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
      await db.insert(schema.favorites).values({
        id,
        userId,
        venueId,
        createdAt: now,
      });

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
    const rows = await db
      .select({ venueId: schema.favorites.venueId })
      .from(schema.favorites)
      .where(eq(schema.favorites.userId, userId));
    return rows.map((r) => r.venueId);
  } catch (error) {
    console.error("Failed to get favorite IDs:", error);
    return [];
  }
}
