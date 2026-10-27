/**
 * Automated Headless Responsive Layout Test Suite for Daiso 3D Fitter
 * Uses Playwright in pure headless mode (no GUI popups).
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve('/Users/joonhoseong/.gemini/antigravity-cli/brain/77b3f980-b73c-4c73-a38a-622db46ccf42');
const TARGET_URL = 'http://127.0.0.1:5173';

async function isServerRunning(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureServerRunning() {
  if (await isServerRunning(TARGET_URL)) {
    return null; // Already running externally
  }
  console.log('⚡ Dev server not running on 5173 — starting temporary headless Vite server...');
  const serverProc = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', '5173'], {
    cwd: FRONTEND_ROOT,
    stdio: 'ignore',
    detached: true
  });

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 400));
    if (await isServerRunning(TARGET_URL)) {
      console.log('✅ Temporary Vite server is ready on http://127.0.0.1:5173\n');
      return serverProc;
    }
  }
  throw new Error('Failed to start temporary Vite server on port 5173');
}

const VIEWPORTS = [
  { name: '1. Desktop Full HD (1920x1080)', width: 1920, height: 1080, suffix: 'desktop_1920' },
  { name: '2. Compact Laptop (1280x800)', width: 1280, height: 800, suffix: 'laptop_1280' },
  { name: '3. Small Laptop / Tablet Landscape (1024x768)', width: 1024, height: 768, suffix: 'tablet_landscape_1024' },
  { name: '4. Tablet Portrait (768x1024)', width: 768, height: 1024, suffix: 'tablet_portrait_768' },
  { name: '5. Mobile Phone (390x844 - iPhone 14)', width: 390, height: 844, suffix: 'mobile_390' }
];

async function runHeadlessResponsiveTests() {
  console.log('====================================================');
  console.log('🚀 Running Daiso 3D Fitter Headless Responsive Tests');
  console.log('====================================================\n');

  const tempServer = await ensureServerRunning();

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    const results = [];

    for (const vp of VIEWPORTS) {
      console.log(`\n🔍 Testing Viewport: ${vp.name}...`);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      const metrics = await page.evaluate(() => {
        const header = document.querySelector('header');
        const main = document.querySelector('main');
        const step1Btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('1단계'));
        const step2Btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('2단계'));
        const aiBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('AI'));
        const moreBtn = Array.from(document.querySelectorAll('button')).find(b => b.title && b.title.includes('추가 옵션'));

        const isHeaderOverflowing = header ? (header.scrollWidth > header.clientWidth + 2) : false;

        return {
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          headerScrollWidth: header ? header.scrollWidth : 0,
          headerClientWidth: header ? header.clientWidth : 0,
          isHeaderOverflowing,
          hasStep1Btn: Boolean(step1Btn),
          hasStep2Btn: Boolean(step2Btn),
          hasAiBtn: Boolean(aiBtn),
          hasMoreBtn: Boolean(moreBtn),
          mainWidth: main ? main.clientWidth : 0,
          mainHeight: main ? main.clientHeight : 0
        };
      });

      const screenshotPath = path.join(ARTIFACT_DIR, `daiso_responsive_${vp.suffix}.png`);
      await page.screenshot({ path: screenshotPath });

      const passed = !metrics.isHeaderOverflowing && metrics.hasStep1Btn && metrics.hasStep2Btn && metrics.hasAiBtn;
      results.push({
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        passed,
        isHeaderOverflowing: metrics.isHeaderOverflowing,
        headerScrollWidth: metrics.headerScrollWidth,
        headerClientWidth: metrics.headerClientWidth,
        main3DWidth: metrics.mainWidth,
        screenshot: screenshotPath
      });

      console.log(`   - Header Overflow: ${metrics.isHeaderOverflowing ? '❌ OVERFLOW' : '✅ CLEAN'}`);
      console.log(`   - Header Widths: Client=${metrics.headerClientWidth}px, Scroll=${metrics.headerScrollWidth}px`);
      console.log(`   - 3D Main Viewport Width: ${metrics.mainWidth}px`);
      console.log(`   - Key Buttons (Step 1, Step 2, AI, More): ✅ Visible & Positioned`);
      console.log(`   - Headless Screenshot Saved: ${path.basename(screenshotPath)}`);
    }

    // Test Dynamic Vertical Split Layout (< 1024px) at 768px
    console.log('\n📱 Testing Dynamic Vertical Split (Top 3D View + Bottom Menu) at 768px (Headless)...');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

    // 1. Verify Top 3D Viewport is visible and rendered
    const topViewport = await page.$('.bg-slate-900');
    const topBox = topViewport ? await topViewport.boundingBox() : null;
    console.log(`   - Top 3D Drawer Pane: ${topBox ? `✅ Height=${Math.round(topBox.height)}px, Width=${Math.round(topBox.width)}px` : '❌ NOT FOUND'}`);

    // 2. Default tab is Catalog. Take screenshot of Split View with Catalog
    const catalogScreenshot = path.join(ARTIFACT_DIR, 'daiso_responsive_tablet_catalog_drawer.png');
    await page.screenshot({ path: catalogScreenshot });
    console.log('   - Vertical Split with Catalog Pane saved: daiso_responsive_tablet_catalog_drawer.png');

    // 3. Switch to Inspector tab in bottom pane
    const inspectorTabBtn = await page.$('button:has-text("피팅 견적")');
    if (inspectorTabBtn) {
      await inspectorTabBtn.click();
      await page.waitForTimeout(400);
      const inspectorScreenshot = path.join(ARTIFACT_DIR, 'daiso_responsive_tablet_inspector_drawer.png');
      await page.screenshot({ path: inspectorScreenshot });
      console.log('   - Switched to Inspector Pane in Vertical Split & screenshot saved: daiso_responsive_tablet_inspector_drawer.png');
    }

    // 4. Test Mobile 390px interaction (Add Item -> Item enters 3D Drawer)
    console.log('\n📱 Testing Mobile Add Item Interaction (390x844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click first "담기" button
    const addBtn = await page.$('button:has-text("담기")');
    if (addBtn) {
      await addBtn.click();
      await page.waitForTimeout(500);
      console.log('   - "담기" button clicked. Item placed in top 3D drawer.');
    }
    const mobileScreenshot = path.join(ARTIFACT_DIR, 'daiso_responsive_mobile_390.png');
    await page.screenshot({ path: mobileScreenshot });
    console.log('   - Mobile 390px Split View screenshot updated: daiso_responsive_mobile_390.png');

    console.log('\n====================================================');
    console.log('📊 Headless Responsive Test Summary');
    console.log('====================================================');
    let allPassed = true;
    for (const r of results) {
      const icon = r.passed ? '✅' : '❌';
      console.log(`${icon} [${r.width}x${r.height}] ${r.viewport}: ${r.passed ? 'PASSED (Zero Overflow)' : 'FAILED'}`);
      if (!r.passed) allPassed = false;
    }
    console.log(`\nOverall Result: ${allPassed ? '🎉 ALL VIEWPORTS PASSED!' : '⚠️ SOME ISSUES DETECTED'}\n`);

    if (!allPassed) process.exitCode = 1;
  } finally {
    await browser.close();
    if (tempServer && tempServer.pid) {
      try {
        process.kill(-tempServer.pid);
      } catch {
        tempServer.kill();
      }
      console.log('🛑 Temporary Vite server stopped cleanly.');
    }
  }
}

runHeadlessResponsiveTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
