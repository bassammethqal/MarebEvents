import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

// تحديد مسار قاعدة البيانات من متغيرات البيئة أو المسار الافتراضي
const dbDirectory = process.env.SQLITE_DB_DIR || path.join(process.cwd(), "data");
const dbFilePath =
  process.env.SQLITE_DB_PATH || path.join(dbDirectory, "mareb_events.db");

// التأكد من وجود مجلد البيانات للـ Persistent Storage
if (!fs.existsSync(/*turbopackIgnore: true*/ dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

// تهيئة عميل Better-SQLite3 مع إعدادات الأداء وحماية التزامن العالي
export const sqlite = new Database(dbFilePath);

// تفعيل وضع WAL (Write-Ahead Logging) لتحقيق أداء قراءة وكتابة متزامنة
sqlite.pragma("journal_mode = WAL");

// تفعيل القيود والمفاتيح الأجنبية
sqlite.pragma("foreign_keys = ON");

// تحسين سرعة المزامنة بأمان في وضع WAL
sqlite.pragma("synchronous = NORMAL");

// مهلة الانتظار عند التزامن لمنع إغلاق المعاملات في حال الضغط (5 ثوانٍ)
sqlite.pragma("busy_timeout = 5000");

// تهيئة Drizzle ORM مع المخطط
export const db = drizzle(sqlite, { schema });

export { schema };
