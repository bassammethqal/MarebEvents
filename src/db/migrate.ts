import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, client } from "./index";
import path from "path";

/**
 * دالة تشغيل التهجيرات (Migrations) التلقائية لقاعدة بيانات PostgreSQL (Supabase)
 */
export async function runMigrations() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  console.log(`Running migrations from: ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied successfully!");
}

// دالة مساعدة لتشغيل التهجيرات من سطر الأوامر أو عند بدء السيرفر
export async function run() {
  await runMigrations();
  await client.end();
}

if (process.argv[1]?.includes("migrate")) {
  run();
}
