import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "./index";
import path from "path";

/**
 * دالة تشغيل التهجيرات (Migrations) التلقائية لقاعدة بيانات SQLite
 */
export function runMigrations() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  console.log(`Running migrations from: ${migrationsFolder}`);
  migrate(db, { migrationsFolder });
  console.log("Migrations applied successfully!");
}

// دالة مساعدة لتشغيل التهجيرات من سطر الأوامر أو عند بدء السيرفر
export async function run() {
  runMigrations();
  sqlite.close();
}

if (process.argv[1]?.includes("migrate")) {
  run();
}
