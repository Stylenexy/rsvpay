// Every page, scrolled end to end: no file of ours may answer 4xx or 5xx, and every image must decode.
import { openBrowser } from './browser.mjs';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const origin = new URL(BASE).origin;
const ROUTES = ['/', '/#/beri/3', '/#/buka', '/#/buku/3', '/#/coba'];
const SIZES = [[1366, 768], [360, 740]];

const browser = await openBrowser();
const seen = new Set();
const broken = [];
const failed = [];

for (const [width, height] of SIZES) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  page.on('response', (response) => {
    const url = response.url();
    if (!url.startsWith(origin)) return;
    seen.add(new URL(url).pathname);
    if (response.status() >= 400) broken.push(`${response.status()} ${new URL(url).pathname} from ${page.url()}`);
  });
  page.on('requestfailed', (request) => {
    if (request.url().startsWith(origin) && request.failure()?.errorText !== 'net::ERR_ABORTED') failed.push(`${request.failure()?.errorText} ${request.url()}`);
  });
  for (const route of ROUTES) {
    await page.goto(`${BASE.replace(/\/$/, '')}${route}`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const end = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (let y = 0; y <= end; y += height) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
      await page.waitForTimeout(90);
    }
    await page.waitForTimeout(700);
    const blank = await page.evaluate(() => [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src));
    for (const src of blank) failed.push(`did not decode ${src} on ${route}`);
    if (route === '/#/coba') await page.goto('about:blank');
  }
  await context.close();
}
await browser.close();

console.log(`checked ${seen.size} files on ${origin}`);
for (const line of [...new Set([...broken, ...failed])]) console.log(`FAIL | ${line}`);
const bad = broken.length + failed.length;
console.log(bad ? `FAIL | ${bad} problems` : 'PASS | every file answered and every image decoded');
process.exit(bad ? 1 : 0);
