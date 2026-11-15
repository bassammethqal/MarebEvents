import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "mareb_events.db");
console.log("==================================================================");
console.log(`Connecting to SQLite DB at: ${dbPath}`);
console.log("==================================================================");

const db = new Database(dbPath);

interface TableRow {
  name: string;
}

interface CountRow {
  count: number;
}

interface IndexRow {
  name: string;
  tbl_name: string;
}

// 1. استعلام جداول قاعدة البيانات
const tables = db
  .prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  )
  .all() as TableRow[];

console.log(`\n[1] Total Tables Found: ${tables.length}`);
tables.forEach((t, i) => {
  const count = db.prepare(`SELECT count(*) as count FROM "${t.name}"`).get() as CountRow;
  console.log(`  ${(i + 1).toString().padStart(2, " ")}. Table: ${t.name.padEnd(26, " ")} | Rows: ${count.count}`);
});

// 2. استعلام الفهارس
const indexes = db
  .prepare(
    "SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY tbl_name, name"
  )
  .all() as IndexRow[];
console.log(`\n[2] Total Indexes Found: ${indexes.length}`);

// 3. اختبار فحص سلامة قاعدة البيانات
const integrity = db.pragma("integrity_check");
console.log("\n[3] SQLite PRAGMA integrity_check result:", integrity);

// 4. اختبار تفعيل نمط WAL والمفاتيح الأجنبية
const journalMode = db.pragma("journal_mode");
const foreignKeys = db.pragma("foreign_keys");
console.log(`[4] PRAGMA journal_mode: ${JSON.stringify(journalMode)}`);
console.log(`[5] PRAGMA foreign_keys: ${JSON.stringify(foreignKeys)}`);

db.close();
console.log("\n==================================================================");
console.log("Direct SQLite Verification Complete.");
console.log("==================================================================");
