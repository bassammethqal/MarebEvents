import { chromium } from "playwright-core";
import path from "path";
import fs from "fs";

async function capture() {
  const browser = await chromium.launch({ channel: "msedge" });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const outDir = path.join(process.cwd(), "screenshots");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  await page.screenshot({ path: path.join(outDir, "desktop-mobile-frame.png") });
  console.log("Captured: desktop-mobile-frame.png");

  await browser.close();
}

capture().catch(console.error);
