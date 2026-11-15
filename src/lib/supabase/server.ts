import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * عميل Supabase للخادم (Server Components, Server Actions, Route Handlers).
 * يتعامل مع الـ Cookies بأمان عبر next/headers.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "بيانات الربط مع Supabase غير متوفرة. يرجى إضافة NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY في ملف .env.local"
    );
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // يتم تجاهل هذا الخطأ في حال استدعاء الدالة من Server Component للقراءة فقط،
          // حيث يتولى الـ Proxy تجديد وتحديث الكوكيز في دورة حياة الطلب.
        }
      },
    },
  });
}
