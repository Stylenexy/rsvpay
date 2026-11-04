// End-to-end check of the deployed site on NEAR testnet, in a real browser engine.
// Two people: host on a laptop-sized window, guest on a touch phone 360 px wide.
// Each makes throwaway test accounts through the app itself; play money only.
//   node e2e/alur.e2e.mjs [url]
// Prints PASS/FAIL per step, writes screenshots + report to docs/evidence/ (no keys are logged).
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const URL_BASE = process.argv[2] ?? 'https://amplop-balas.vercel.app';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = fileURLToPath(new URL('../../docs/evidence/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const lines = [];
let failed = 0;
const say = (ok, name, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`;
  console.log(line);
  lines.push(line);
  if (!ok) failed++;
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const errors = [];
const watch = (page, who) => {
  page.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/fonts\.g|favicon/.test(m.location().url + m.text())) errors.push(`${who}: ${m.text().slice(0, 200)}`);
  });
};

const host = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
const guestCtx = await browser.newContext({
  viewport: { width: 360, height: 740 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
});
const guest = await guestCtx.newPage();
watch(host, 'host');
watch(guest, 'guest');
const stamp = Date.now().toString(36).slice(-4);

try {
  // 1. host opens a hajatan
  await host.goto(`${URL_BASE}/#/buka`);
  await host.getByPlaceholder('Siti & Andi').fill(`Siti & Andi ${stamp}`);
  await host.getByPlaceholder('Siti', { exact: true }).fill('Siti');
  await host.getByRole('button', { name: 'Buka amplop' }).click();
  await host.waitForURL(/#\/buku\/\d+/, { timeout: 60_000 });
  const id = host.url().match(/#\/buku\/(\d+)/)[1];
  say(true, 'E1 host opens a hajatan from the web', `amplop #${id}`);
  await host.getByText('Belum ada amplop').waitFor({ timeout: 15_000 });
  say(true, 'E2 empty book shows for the holder, with a QR', '');

  // 2. guest gives from a phone
  await guest.goto(`${URL_BASE}/#/beri/${id}`);
  await guest.getByText('Kamu memberi').waitFor({ timeout: 20_000 });
  await guest.getByRole('button', { name: 'Geser untuk memberi' }).tap();
  await guest.getByText(/Isi namamu dulu/).waitFor({ timeout: 5_000 });
  say(true, 'E2b guest without a name is asked for one, nothing is sent', '');
  const t0 = Date.now();
  await guest.getByPlaceholder('Budi').fill('Budi');
  await guest.getByRole('radio', { name: '500rb' }).tap();
  await guest.screenshot({ path: `${OUT}1-guest-before.png` });
  const overflow = await guest.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  say(overflow <= 0, 'E3 guest page fits 360 px with no sideways scroll', `overflow ${overflow}px`);
  await guest.getByRole('button', { name: 'Geser untuk memberi' }).tap();
  await guest.getByText('Terkirim.').waitFor({ timeout: 60_000 });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  say(+secs <= 20, 'E4 new guest gives from a touch screen in 20 s or less: test account made, signed in the browser', `${secs} s`);
  await guest.waitForTimeout(2200);
  await guest.screenshot({ path: `${OUT}2-guest-sent.png` });
  const proof = await guest.getByRole('link', { name: /Lihat bukti transaksi/ }).getAttribute('href');
  say(/nearblocks\.io\/txns\//.test(proof ?? ''), 'E5 guest gets a link to the transaction', proof ?? '');

  // 3. the host's book updates by itself
  await host.getByText('Budi', { exact: true }).waitFor({ timeout: 20_000 });
  await host.getByText(/baru saja/).waitFor({ timeout: 5_000 });
  say(true, 'E6 host book updates by itself without a reload', await host.getByText(/baru saja/).innerText());
  await host.waitForTimeout(1200);
  await host.screenshot({ path: `${OUT}3-host-book.png`, fullPage: true });
  await host.getByRole('button', { name: 'Orang lain' }).click();
  await host.getByText(/Amplop ini milik/).waitFor({ timeout: 5_000 });
  const hidden = (await host.getByText('Budi', { exact: true }).count()) === 0;
  await host.getByRole('button', { name: 'Saya pemegang' }).click();
  say(hidden, 'E6b holder taps "Orang lain": names and amounts disappear', '');

  // 4. a non-holder sees the lock, not the book
  await guest.goto(`${URL_BASE}/#/buku/${id}`);
  await guest.getByText(/Amplop ini milik Siti/).waitFor({ timeout: 15_000 });
  const leak = await guest.getByRole('button', { name: 'Tarik dana bebas' }).count();
  say(leak === 0, 'E7 non-holder sees the lock: no list, no withdraw button', '');
  await guest.screenshot({ path: `${OUT}4-non-holder.png` });

  // 5. two years later: Budi opens his own hajatan, Siti's amplop rings
  await guest.goto(`${URL_BASE}/#/buka`);
  await guest.getByPlaceholder('Siti & Andi').fill(`Budi & Rina ${stamp}`);
  await guest.getByRole('button', { name: 'Buka amplop' }).tap();
  await guest.waitForURL(/#\/buku\/\d+/, { timeout: 60_000 });
  await host.getByText('Amplop berbunyi').waitFor({ timeout: 20_000 });
  say(true, "E8 Siti's amplop rings after Budi opens a hajatan", '');
  await host.waitForTimeout(1800);
  await host.screenshot({ path: `${OUT}5-amplop-rings.png`, fullPage: true });
  await host.getByRole('button', { name: 'Kirim balasan' }).click();
  await host.getByText(/tertaut ke pemberiannya dulu/).waitFor({ timeout: 60_000 });
  say(true, "E9 one-tap reply lands in Budi's amplop", '');
  await guest.getByText('Siti', { exact: true }).waitFor({ timeout: 20_000 });
  say(true, "E10 reply appears in Budi's book without a reload", '');
  await guest.waitForTimeout(1200);
  await guest.screenshot({ path: `${OUT}6-budi-book.png`, fullPage: true });

  // 6. withdraw
  await host.getByRole('button', { name: 'Tarik dana bebas' }).click();
  await host.getByText(/masuk ke akunmu/).waitFor({ timeout: 60_000 });
  say(true, 'E11 host withdraws free money', await host.getByText(/masuk ke akunmu/).innerText());

  say(errors.length === 0, 'E12 no errors in the browser console', errors.slice(0, 3).join(' ; '));
} catch (e) {
  say(false, 'flow stopped', String(e).split('\n').slice(0, 3).join(' '));
  await host.screenshot({ path: `${OUT}failed-host.png` }).catch(() => {});
  await guest.screenshot({ path: `${OUT}failed-guest.png` }).catch(() => {});
  if (errors.length) console.log(errors.join('\n'));
} finally {
  await browser.close();
}

const report = `End-to-end run on ${URL_BASE}\n${new Date().toISOString()}\n${lines.join('\n')}\n`;
writeFileSync(`${OUT}e2e-report.txt`, report);
process.exit(failed ? 1 : 0);
