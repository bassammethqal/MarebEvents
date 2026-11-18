import { chromium } from "playwright-core";
import path from "path";
import fs from "fs";

async function captureMobilePWA() {
  const browser = await chromium.launch({ channel: "msedge" });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
    deviceScaleFactor: 2,
    hasTouch: true,
  });

  const page = await context.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const outDir = path.join(process.cwd(), "screenshots");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  await page.screenshot({ path: path.join(outDir, "pwa-customer-home-mobile.png") });
  console.log("Captured: pwa-customer-home-mobile.png");

  // Capture My Bookings
  await page.goto("http://localhost:3000/my-bookings", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "pwa-customer-bookings-mobile.png") });
  console.log("Captured: pwa-customer-bookings-mobile.png");

  // Capture Favorites
  await page.goto("http://localhost:3000/favorites", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "pwa-customer-favorites-mobile.png") });
  console.log("Captured: pwa-customer-favorites-mobile.png");

  await browser.close();
}

captureMobilePWA().catch(console.error);
