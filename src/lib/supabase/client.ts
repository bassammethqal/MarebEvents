import { createBrowserClient } from "@supabase/ssr";

/**
 * عميل Supabase للمتصفح (Client Components).
 * يعتمد على المفتاح العام (Publishable Key) وهو آمن للاستخدام في المتصفح.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "بيانات الربط مع Supabase غير متوفرة. يرجى إضافة NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY في ملف .env.local"
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
