// Every page, scrolled end to end: no file of ours may answer 4xx or 5xx, and every image must decode.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

const bad = broken.length + failed.length;
const lines = [
  `checked ${seen.size} files on ${origin}`,
  `pages: ${ROUTES.join(' ')}`,
  `screens: ${SIZES.map(([w, h]) => `${w}x${h}`).join(', ')}, each page scrolled end to end`,
  ...[...new Set([...broken, ...failed])].map((line) => `FAIL | ${line}`),
  bad ? `FAIL | ${bad} problems` : 'PASS | every file answered and every image decoded',
];
console.log(lines.join('\n'));
if (process.env.REPORT) {
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', dateStyle: 'short' }).format(new Date());
  writeFileSync(fileURLToPath(new URL('../../docs/evidence/asset-check-report.txt', import.meta.url)), `${day} Asia/Jakarta, ${BASE}\n${lines.join('\n')}\n`);
}
process.exit(bad ? 1 : 0);
