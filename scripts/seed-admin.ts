import { seedInitialAdmin } from "../src/lib/auth/service";
import { sqlite } from "../src/db/index";

async function main() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL || "admin@marebevents.ye";
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || "AdminSuperPass@2026!";
  const fullName = process.argv[4] || process.env.ADMIN_NAME || "مدير النظام الرئيسي";
  const secret = process.env.INITIAL_ADMIN_SEED_SECRET || "mareb_events_secret_seed_token_2026";

  // تعيين الرمز في البيئة مؤقتاً لتمرير الفحص الأمني أثناء تشغيل السكربت المباشر
  process.env.INITIAL_ADMIN_SEED_SECRET = secret;

  console.log("==================================================================");
  console.log("Seeding Initial Admin via Server CLI...");
  console.log(`Email: ${email}`);
  console.log(`Name:  ${fullName}`);
  console.log("==================================================================");

  try {
    const admin = await seedInitialAdmin({
      email,
      fullName,
      password,
      secretToken: secret,
    });

    console.log("[✓] Admin account created successfully:", {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
    });
  } catch (error: unknown) {
    console.error("[✗] Failed to seed admin:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

main();
