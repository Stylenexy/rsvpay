// The browser every e2e script drives.
// A Chrome already listening for DevTools (CDP, default http://127.0.0.1:9333) is reused.
// Otherwise an installed Chrome starts headless: the one at $CHROME, or, outside Windows,
// Playwright's "chrome" channel. On Windows set CHROME to chrome.exe, for example
//   set CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe
import { chromium } from 'playwright-core';

export async function openBrowser() {
  const cdp = process.env.CDP ?? 'http://127.0.0.1:9333';
  try {
    return await chromium.connectOverCDP(cdp, { timeout: 4000 });
  } catch {
    const chrome = process.env.CHROME;
    if (!chrome && process.platform === 'win32') {
      throw new Error(`No Chrome is listening on ${cdp}. Set CHROME to the path of chrome.exe and run again.`);
    }
    return chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : { channel: 'chrome' }) });
  }
}

/** A protected Vercel preview opens only after its share link has set a cookie in this browser context. */
export async function share(context) {
  if (!process.env.E2E_SHARE) return;
  const page = await context.newPage();
  await page.goto(process.env.E2E_SHARE, { waitUntil: 'domcontentloaded' });
  await page.close();
}
