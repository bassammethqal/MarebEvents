import { db, schema, sqlite } from "../src/db/index";
import { eq } from "drizzle-orm";

async function main() {
  console.log("==================================================================");
  console.log("Testing Application Drizzle ORM Connection (src/db/index.ts)...");
  console.log("==================================================================");

  // 1. فحص صحة الاتصال الأساسي
  const testCategoryId = "cat-test-" + Date.now();
  const testCategorySlug = "test-category-" + Date.now();

  try {
    // 2. تجربة معاملة (Atomic Transaction) وكتابة سجل تجريبي
    console.log("[1] Inserting test record into venueCategories...");
    db.transaction((tx) => {
      tx.insert(schema.venueCategories)
        .values({
          id: testCategoryId,
          slug: testCategorySlug,
          nameAr: "تصنيف تجريبي للاختبار",
          descriptionAr: "فحص اتصال Drizzle ORM بـ SQLite",
          displayOrder: 99,
          isActive: true,
          createdAt: new Date().toISOString(),
        })
        .run();
    });

    // 3. قراءة السجل عبر استعلام Drizzle ORM
    console.log("[2] Querying inserted record via Drizzle ORM...");
    const category = db
      .select()
      .from(schema.venueCategories)
      .where(eq(schema.venueCategories.id, testCategoryId))
      .get();

    if (!category || category.slug !== testCategorySlug) {
      throw new Error("Failed to read back inserted category!");
    }
    console.log("  -> Successfully fetched record:", {
      id: category.id,
      slug: category.slug,
      nameAr: category.nameAr,
      isActive: category.isActive,
    });

    // 4. اختبار إضافة مستخدم تجريبي وصلاحياته
    console.log("\n[3] Testing user insertion with role...");
    const testUserId = "usr-test-" + Date.now();
    db.insert(schema.users)
      .values({
        id: testUserId,
        email: `test-${Date.now()}@marebevents.ye`,
        phone: `+96777000${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: "مستخدم تجريبي للفحص",
        role: "admin",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();

    const user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, testUserId))
      .get();

    console.log("  -> Successfully created user:", {
      id: user?.id,
      email: user?.email,
      role: user?.role,
      isActive: user?.isActive,
    });

    // 5. تنظيف السجلات التجريبية
    console.log("\n[4] Cleaning up test records...");
    db.delete(schema.venueCategories)
      .where(eq(schema.venueCategories.id, testCategoryId))
      .run();
    db.delete(schema.users).where(eq(schema.users.id, testUserId)).run();

    console.log("  -> Clean up done.");

    // 6. التحقق من نمط WAL عبر الاتصال النشط
    const walCheck = sqlite.pragma("journal_mode");
    console.log(`\n[5] Active App Connection journal_mode:`, walCheck);

    console.log("\n==================================================================");
    console.log(">>> ALL APPLICATION DATABASE TESTS PASSED SUCCESSFULLY! <<<");
    console.log("==================================================================");
  } catch (error) {
    console.error("Database connection test failed with error:", error);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

main();
