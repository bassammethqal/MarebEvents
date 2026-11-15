import { getCurrentSession, type SafeUser } from "./session";
import { schema } from "@/db";

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * فحص تسجيل الدخول الإجباري (Authentication Guard)
 */
export async function requireAuth(): Promise<{
  user: SafeUser;
  session: schema.Session;
}> {
  const current = await getCurrentSession();
  if (!current) {
    throw new AuthError("غير مصرح لك. يرجى تسجيل الدخول أولاً.", 401);
  }
  return current;
}

/**
 * فحص الصلاحيات والأدوار الإجباري (Role-Based Access Control Guard)
 */
export async function requireRole(
  allowedRoles: Array<"customer" | "owner" | "admin">
): Promise<{
  user: SafeUser;
  session: schema.Session;
}> {
  const { user, session } = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(
      `غير مصرح لك بالوصول. يتطلب هذا الإجراء صلاحيات: [${allowedRoles.join(", ")}]. دورك الحالي: ${user.role}.`,
      403
    );
  }

  return { user, session };
}

/**
 * اختصار للتحقق من صلاحية المدير (Admin Only)
 */
export async function requireAdmin(): Promise<{
  user: SafeUser;
  session: schema.Session;
}> {
  return await requireRole(["admin"]);
}

/**
 * اختصار للتحقق من صلاحية المالك أو المدير (Owner or Admin)
 */
export async function requireOwnerOrAdmin(): Promise<{
  user: SafeUser;
  session: schema.Session;
}> {
  return await requireRole(["owner", "admin"]);
}

/**
 * حماية تعديل الحسابات ومنع تصعيد الصلاحيات (Privilege Escalation Protection)
 * تضمن:
 * 1. لا يمكن لأي مستخدم تعديل حساب مستخدم آخر إلا إذا كان Admin.
 * 2. لا يمكن لأي مستخدم عادي أو مالك تعديل دوره (role) أو حالة حسابه (isActive).
 */
export function assertCanModifyProfile(
  actor: SafeUser,
  targetUserId: string,
  requestedUpdates: Record<string, unknown>
): void {
  const isSelf = actor.id === targetUserId;
  const isAdmin = actor.role === "admin";

  if (!isSelf && !isAdmin) {
    throw new AuthError("لا يمكنك تعديل بيانات مستخدم آخر.", 403);
  }

  // إذا لم يكن مديراً، يحظر تماماً محاولة تمرير حقل الدور أو حالة التفعيل
  if (!isAdmin) {
    if ("role" in requestedUpdates) {
      throw new AuthError("لا تملك الصلاحية لتعديل نوع أو صلاحيات حسابك.", 403);
    }
    if ("isActive" in requestedUpdates) {
      throw new AuthError("لا تملك الصلاحية لتعديل حالة تفعيل الحساب.", 403);
    }
  }
}
