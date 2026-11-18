import Database from 'better-sqlite3';

const sqlite = new Database('data/mareb_events.db');

const tables = sqlite
  .prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'"
  )
  .all() as { name: string }[];

console.log('--- SQLite Database Inspection ---');
for (const t of tables) {
  const count = (
    sqlite.prepare(`SELECT count(*) as c FROM "${t.name}"`).get() as { c: number }
  ).c;
  console.log(`  - ${t.name}: ${count} rows`);
}
sqlite.close();
