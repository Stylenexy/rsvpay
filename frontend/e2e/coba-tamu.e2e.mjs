// The judge's first 30 seconds on a phone: home page, "Coba jadi tamu", give into the demo amplop.
//   node e2e/coba-tamu.e2e.mjs [url]
// E2E_PARENT works as in alur.e2e.mjs when the testnet helper rate-limits.
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const URL_BASE = process.argv[2] ?? 'https://amplop-balas.vercel.app';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = fileURLToPath(new URL('../../docs/evidence/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
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
const page = await ctx.newPage();
await page.goto(URL_BASE);
await page.getByRole('link', { name: 'Coba jadi tamu' }).waitFor({ timeout: 20_000 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}0-home.png` });
await page.getByRole('link', { name: 'Coba jadi tamu' }).tap();
await page.getByText('Kamu memberi').waitFor({ timeout: 20_000 });
if (!PARENT) await page.getByPlaceholder('Budi').fill('Juri');
const t0 = Date.now();
// a real slide, not a tap: press the round button and drag it to the end of the track
const box = await page.getByRole('button', { name: 'Geser untuk memberi' }).boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + 300, box.y + box.height / 2, { steps: 14 });
await page.mouse.up();
await page.getByText('Terkirim.').waitFor({ timeout: 60_000 });
console.log(`PASS | home, try as guest, slide to give, sent | ${((Date.now() - t0) / 1000).toFixed(1)} s`);
await page.waitForTimeout(2300);
await page.screenshot({ path: `${OUT}2-guest-sent.png` });
await browser.close();
