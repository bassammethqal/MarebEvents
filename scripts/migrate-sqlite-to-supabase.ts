import Database from "better-sqlite3";
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DIRECT_URL or DATABASE_URL in .env.local");
  process.exit(1);
}

const sqlite = new Database("data/mareb_events.db");
const pg = postgres(connectionString, { ssl: "require", prepare: false });

// Tables in strict Foreign Key order
const migrationOrder = [
  "venue_categories",
  "cancellation_policies",
  "amenities",
  "users",
  "sessions",
  "venues",
  "venue_units",
  "venue_members",
  "pricing_tiers",
  "venue_amenities",
  "venue_images",
  "bookings",
  "booking_requested_units",
  "booking_slots",
  "booking_extras",
  "booking_guest_details",
  "booking_price_items",
  "booking_audit_logs",
  "payments",
  "webhook_events",
  "favorites",
  "reviews",
  "notifications",
  "venue_availability",
  "auth_rate_limits",
];

// Helper to convert SQLite 0/1 integers to JS booleans for known boolean columns
const booleanColumnsByTable: Record<string, string[]> = {
  venue_categories: ["is_active"],
  amenities: ["is_active"],
  users: ["is_active", "phone_verified", "email_verified"],
  venues: ["is_active", "featured"],
  venue_units: ["is_active"],
  pricing_tiers: ["is_default"],
  venue_images: ["is_cover"],
  bookings: ["emergency_hold"],
  booking_slots: ["is_conflict"],
  reviews: ["is_verified", "is_public"],
  notifications: ["is_read"],
  venue_availability: ["is_available"],
};

async function migrate() {
  console.log("=== Starting SQLite to Supabase PostgreSQL Data Migration ===");

  try {
    // Test connection first
    const [test] = await pg`SELECT current_database() as db, current_user as usr`;
    console.log(`Connected to database "${test.db}" as "${test.usr}".`);

    for (const tableName of migrationOrder) {
      // Check if table exists in SQLite
      const tableCheck = sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
        )
        .get(tableName);

      if (!tableCheck) {
        continue;
      }

      const rows = sqlite.prepare(`SELECT * FROM "${tableName}"`).all() as Record<string, any>[];
      if (rows.length === 0) {
        console.log(`  [SKIP] ${tableName}: 0 rows`);
        continue;
      }

      console.log(`  [MIGRATING] ${tableName}: ${rows.length} rows...`);

      const boolCols = new Set(booleanColumnsByTable[tableName] || []);

      // Clean/convert boolean fields
      const formattedRows = rows.map((row) => {
        const newRow: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          if (boolCols.has(key) && value !== null && value !== undefined) {
            newRow[key] = Boolean(value);
          } else {
            newRow[key] = value;
          }
        }
        return newRow;
      });

      // Insert in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < formattedRows.length; i += chunkSize) {
        const chunk = formattedRows.slice(i, i + chunkSize);
        await pg`
          INSERT INTO ${pg(tableName)} ${pg(chunk)}
          ON CONFLICT DO NOTHING
        `;
      }

      console.log(`  [SUCCESS] ${tableName}: Migrated ${formattedRows.length} rows.`);
    }

    console.log("\n=== Migration Completed Successfully! ===");
  } catch (error) {
    console.error("Migration FAILED:", error);
  } finally {
    sqlite.close();
    await pg.end();
  }
}

migrate();
