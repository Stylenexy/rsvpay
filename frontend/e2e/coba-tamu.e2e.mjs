// The judge's first 30 seconds on a phone: home page, "Coba jadi tamu", give into the demo amplop.
//   node e2e/coba-tamu.e2e.mjs [url]
// E2E_PARENT works as in alur.e2e.mjs when the testnet helper rate-limits.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openBrowser } from './browser.mjs';

const URL_BASE = process.argv[2] ?? 'https://rsvpay.vercel.app';

const OUT = fileURLToPath(new URL('../../docs/evidence/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const browser = await openBrowser();
const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const PARENT = process.env.E2E_PARENT;
if (PARENT) {
  const { Account, JsonRpcProvider, KeyPair, nearToYocto } = await import('near-api-js');
  const { accountId, secret } = JSON.parse(readFileSync(PARENT, 'utf8'));
  const parent = new Account(accountId, new JsonRpcProvider({ url: 'https://test.rpc.fastnear.com' }), secret);
  const kp = KeyPair.fromRandom('ed25519');
  const id = `juri-${Date.now().toString(36).slice(-4)}.${accountId}`;
  await parent.createAccount({ newAccountId: id, publicKey: kp.getPublicKey(), nearToTransfer: nearToYocto('0.7') });
  await ctx.addInitScript(
    ([k, a]) => {
      localStorage.setItem('amplop.kunci', k);
      localStorage.setItem('amplop.akun', a);
    },
    [JSON.stringify({ [id]: kp.toString() }), id],
  );
}
await ctx.addInitScript(() => localStorage.setItem('amplop-lang', 'id'));
const page = await ctx.newPage();
await page.goto(`${URL_BASE}/#/beri/${process.env.DEMO ?? '3'}`);
await page.getByText('Kamu memberi').waitFor({ timeout: 20_000 });
if (!PARENT) await page.getByPlaceholder('Budi').fill('Juri');
const t0 = Date.now();
// a real slide, not a tap: press the round button and drag it to the end of the track
await page.getByRole('button', { name: 'Geser untuk memberi' }).scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const box = await page.getByRole('button', { name: 'Geser untuk memberi' }).boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + 300, box.y + box.height / 2, { steps: 14 });
await page.mouse.up();
await page.getByText('Terkirim.').waitFor({ timeout: 45_000 }).catch(async (e) => { await page.screenshot({ path: `${OUT}gagal-tamu.png` }); throw e; });
const took = `${((Date.now() - t0) / 1000).toFixed(1)} s`;
const tx = await page.locator('a.txlink').first().getAttribute('href', { timeout: 5000 }).catch(() => null);
const lines = [
  `PASS | guest page, slide to give, sent | ${took}`,
  `${tx ? 'PASS' : 'FAIL'} | the receipt on screen links to the transaction | ${tx ?? 'no link'}`,
];
console.log(lines.join('\n'));
const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'short' }).format(new Date());
writeFileSync(`${OUT}guest-check-report.txt`, `${day} Asia/Jakarta, ${URL_BASE}, demo book #${process.env.DEMO ?? '3'}, 360x740 touch screen\n${lines.join('\n')}\n`);
await page.waitForTimeout(2300);
await page.screenshot({ path: `${OUT}2-guest-sent.png` });
await browser.close();
