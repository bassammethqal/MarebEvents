import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import fs from "fs";
import path from "path";

function getConnectionString(): string {
  // نفضل DIRECT_URL (Port 5432) لأنه المنفذ القياسي الموثوق لـ PostgreSQL ويتجاوز حظر بعض شبكات الاتصال للمنفذ 6543
  if (process.env.DIRECT_URL) return process.env.DIRECT_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("DIRECT_URL=")) {
          return trimmed.replace("DIRECT_URL=", "").trim();
        }
      }
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("DATABASE_URL=")) {
          return trimmed.replace("DATABASE_URL=", "").trim();
        }
      }
    }
  } catch {}
  return "postgresql://postgres:postgres@localhost:5432/postgres";
}

const connectionString = getConnectionString();

// نمط Singleton للاتصال لضمان عدم تكرار الاتصالات أثناء الـ Hot Reloading في بيئات Next.js
const globalForDb = globalThis as unknown as {
  client: postgres.Sql | undefined;
  db: PostgresJsDatabase<typeof schema> | undefined;
};

export const client =
  globalForDb.client ??
  postgres(connectionString, {
    prepare: false, // مطلوب للتوافق مع Transaction Pooler في Supabase (Port 6543)
    ssl: "require",
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

export const db = globalForDb.db ?? drizzle(client, { schema });

// حفظ نسخة العميل في globalThis في وضع التطوير والإنتاج لمنع إعادة فتح اتصالات SSL جديدة
globalForDb.client = client;
globalForDb.db = db;

export const sqlite: any = null;

export { schema };
