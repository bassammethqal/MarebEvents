import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";

async function generateIcons() {
  const iconsDir = path.join(process.cwd(), "public", "icons");
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const browser = await chromium.launch({ channel: "msedge" });

  const getSvgHtml = (size: number, isMaskable: boolean = false) => `
    <!DOCTYPE html>
    <html lang="ar">
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: ${size}px;
          height: ${size}px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${isMaskable ? "#020617" : "transparent"};
          font-family: system-ui, -apple-system, sans-serif;
          overflow: hidden;
        }
        .icon-container {
          width: ${size}px;
          height: ${size}px;
          background: radial-gradient(circle at 30% 20%, #1e293b 0%, #0f172a 50%, #020617 100%);
          border-radius: ${isMaskable ? "0" : `${size * 0.22}px`};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: ${isMaskable ? "none" : "inset 0 1px 2px rgba(255,255,255,0.15)"};
          border: ${isMaskable ? "none" : "1px solid rgba(245, 158, 11, 0.2)"};
        }
        .glow {
          position: absolute;
          width: ${size * 0.6}px;
          height: ${size * 0.6}px;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0) 70%);
          filter: blur(${size * 0.05}px);
        }
        svg {
          width: ${size * 0.58}px;
          height: ${size * 0.58}px;
          position: relative;
          z-index: 2;
        }
        .title {
          position: absolute;
          bottom: ${size * 0.12}px;
          font-size: ${size * 0.09}px;
          font-weight: 800;
          color: #f8fafc;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
          z-index: 3;
        }
        .sub {
          position: absolute;
          bottom: ${size * 0.065}px;
          font-size: ${size * 0.045}px;
          font-weight: 600;
          color: #f59e0b;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          z-index: 3;
        }
      </style>
    </head>
    <body>
      <div class="icon-container">
        <div class="glow"></div>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Marib Arches & Castle Crown Motif -->
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fef08a" />
              <stop offset="35%" stop-color="#f59e0b" />
              <stop offset="100%" stop-color="#d97706" />
            </linearGradient>
            <linearGradient id="glowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
              <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.2" />
            </linearGradient>
          </defs>
          
          <!-- Outer Arch -->
          <path d="M 22 75 V 42 C 22 26 34 16 50 16 C 66 16 78 26 78 42 V 75" 
                stroke="url(#goldGrad)" stroke-width="5.5" stroke-linecap="round" />
          
          <!-- Inner Arch -->
          <path d="M 34 75 V 46 C 34 35 41 28 50 28 C 59 28 66 35 66 46 V 75" 
                stroke="url(#goldGrad)" stroke-width="3" stroke-linecap="round" opacity="0.85" />
          
          <!-- Central Celebratory Diamond / Sparkle -->
          <path d="M 50 36 L 53.5 44 L 62 45 L 55.5 50.5 L 57.5 59 L 50 54.5 L 42.5 59 L 44.5 50.5 L 38 45 L 46.5 44 Z" 
                fill="url(#goldGrad)" />
          
          <!-- Subtle Top Crown Nodes -->
          <circle cx="50" cy="11" r="3.5" fill="#fde047" />
          <circle cx="34" cy="17" r="2.5" fill="#f59e0b" />
          <circle cx="66" cy="17" r="2.5" fill="#f59e0b" />
          
          <!-- Historic Pillars Horizontal Base -->
          <line x1="16" y1="75" x2="84" y2="75" stroke="url(#goldGrad)" stroke-width="4.5" stroke-linecap="round" />
        </svg>
        ${size >= 180 ? '<div class="title">مأرب</div>' : ''}
        ${size >= 300 ? '<div class="sub">EVENTS</div>' : ''}
      </div>
    </body>
    </html>
  `;

  const targets = [
    { name: "icon-192x192.png", size: 192, maskable: false },
    { name: "icon-512x512.png", size: 512, maskable: false },
    { name: "icon-maskable-512x512.png", size: 512, maskable: true },
    { name: "apple-touch-icon.png", size: 180, maskable: false },
    { name: "favicon-32x32.png", size: 32, maskable: false },
  ];

  for (const t of targets) {
    const page = await browser.newPage({
      viewport: { width: t.size, height: t.size },
      deviceScaleFactor: 1,
    });
    await page.setContent(getSvgHtml(t.size, t.maskable));
    const filePath = path.join(iconsDir, t.name);
    await page.screenshot({ path: filePath, omitBackground: !t.maskable });
    await page.close();
    console.log(`Generated: ${t.name} (${t.size}x${t.size})`);
  }

  await browser.close();
  console.log("All PWA icons generated successfully!");
}

generateIcons().catch(console.error);
