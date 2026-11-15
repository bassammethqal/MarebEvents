import fs from "fs";
import path from "path";
import { chromium } from "playwright-core";

const CHROME_PATH = "C:\\Users\\Ezz-Adeen Methgal\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe";
const OUTPUT_DIR = path.join(process.cwd(), "screenshots");

async function capture() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log("🚀 جاري إطلاق المتصفح لالتقاط الصور بدقة عالية...");
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  // 1. لقطات سطح المكتب (Desktop 1440x900)
  console.log("📸 التقاط صور سطح المكتب (Desktop)...");
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ar-YE",
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await desktopPage.evaluate(() => document.fonts.ready);
  await desktopPage.waitForTimeout(1000);

  // لقطة الهيرو والبحث
  await desktopPage.screenshot({
    path: path.join(OUTPUT_DIR, "01_desktop_hero_search.png"),
  });
  console.log("  ✅ تم حفظ: 01_desktop_hero_search.png");

  // التمرير لقسم المنشآت والتقاطه
  const venuesSection = desktopPage.locator("#featured-venues");
  if (await venuesSection.count() > 0) {
    await venuesSection.scrollIntoViewIfNeeded();
    await desktopPage.waitForTimeout(500);
    await desktopPage.screenshot({
      path: path.join(OUTPUT_DIR, "02_desktop_featured_venues.png"),
    });
    console.log("  ✅ تم حفظ: 02_desktop_featured_venues.png");
  }

  // لقطة الصفحة الكاملة (Full Page)
  await desktopPage.screenshot({
    path: path.join(OUTPUT_DIR, "03_desktop_full_page.png"),
    fullPage: true,
  });
  console.log("  ✅ تم حفظ: 03_desktop_full_page.png");
  await desktopContext.close();

  // 2. لقطة الجهاز اللوحي (Tablet 768x1024)
  console.log("📸 التقاط صور التابلت (Tablet)...");
  const tabletContext = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    locale: "ar-YE",
  });
  const tabletPage = await tabletContext.newPage();
  await tabletPage.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await tabletPage.evaluate(() => document.fonts.ready);
  await tabletPage.waitForTimeout(500);
  await tabletPage.screenshot({
    path: path.join(OUTPUT_DIR, "04_tablet_view.png"),
  });
  console.log("  ✅ تم حفظ: 04_tablet_view.png");
  await tabletContext.close();

  // 3. لقطات الهاتف المحمول (Mobile iPhone 390x844)
  console.log("📸 التقاط صور الهاتف (Mobile)...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "ar-YE",
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await mobilePage.evaluate(() => document.fonts.ready);
  await mobilePage.waitForTimeout(500);

  await mobilePage.screenshot({
    path: path.join(OUTPUT_DIR, "05_mobile_hero.png"),
  });
  console.log("  ✅ تم حفظ: 05_mobile_hero.png");

  const mobileVenues = mobilePage.locator("#featured-venues");
  if (await mobileVenues.count() > 0) {
    await mobileVenues.scrollIntoViewIfNeeded();
    await mobilePage.waitForTimeout(500);
    await mobilePage.screenshot({
      path: path.join(OUTPUT_DIR, "06_mobile_venues.png"),
    });
    console.log("  ✅ تم حفظ: 06_mobile_venues.png");
  }

  await mobilePage.screenshot({
    path: path.join(OUTPUT_DIR, "07_mobile_full_page.png"),
    fullPage: true,
  });
  console.log("  ✅ تم حفظ: 07_mobile_full_page.png");
  await mobileContext.close();

  await browser.close();
  console.log("🎉 تم الانتهاء من التقاط جميع صور المنصة بنجاح!");
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
