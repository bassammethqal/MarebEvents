import { defineConfig } from "drizzle-kit";
import fs from "fs";

function getEnvUrl(): string {
  try {
    if (fs.existsSync(".env.local")) {
      const content = fs.readFileSync(".env.local", "utf8");
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
  return process.env.DIRECT_URL || process.env.DATABASE_URL || "";
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: getEnvUrl(),
  },
});
