// The judge's first 30 seconds on a phone: home page, "Coba jadi tamu", give into the demo amplop.
//   node e2e/coba-tamu.e2e.mjs [url]
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const URL_BASE = process.argv[2] ?? 'https://amplop-balas.vercel.app';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = fileURLToPath(new URL('./hasil/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto(URL_BASE);
await page.getByRole('link', { name: 'Coba jadi tamu' }).waitFor({ timeout: 20_000 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}0-beranda.png` });
await page.getByRole('link', { name: 'Coba jadi tamu' }).tap();
await page.getByText('Kamu memberi').waitFor({ timeout: 20_000 });
await page.getByPlaceholder('Budi').fill('Juri');
const t0 = Date.now();
await page.getByRole('button', { name: 'Geser untuk memberi' }).tap();
await page.getByText('Terkirim.').waitFor({ timeout: 60_000 });
console.log(`PASS | beranda → coba jadi tamu → terkirim | ${((Date.now() - t0) / 1000).toFixed(1)} dtk`);
await page.waitForTimeout(2300);
await page.screenshot({ path: `${OUT}2-tamu-terkirim.png` });
await browser.close();
