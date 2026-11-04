// End-to-end check of the deployed site on NEAR testnet, in a real browser engine.
// Two people: host on a laptop-sized window, guest on a touch phone 360 px wide.
// Each makes throwaway test accounts through the app itself; play money only.
//   node e2e/alur.e2e.mjs [url]
// Prints PASS/FAIL per step, writes screenshots + report to e2e/hasil/ (no keys are logged).
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const URL_BASE = process.argv[2] ?? 'https://amplop-balas.vercel.app';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = fileURLToPath(new URL('./hasil/', import.meta.url));
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
  say(true, 'E1 tuan rumah membuka hajatan dari web', `amplop #${id}`);
  await host.getByText('Belum ada amplop').waitFor({ timeout: 15_000 });
  say(true, 'E2 buku amplop kosong tampil untuk pemegang, QR ada', '');

  // 2. guest gives from a phone
  await guest.goto(`${URL_BASE}/#/beri/${id}`);
  await guest.getByText('Kamu memberi').waitFor({ timeout: 20_000 });
  await guest.getByRole('button', { name: 'Geser untuk memberi' }).tap();
  await guest.getByText(/Isi namamu dulu/).waitFor({ timeout: 5_000 });
  say(true, 'E2b tamu tanpa nama diminta mengisi nama, tidak ada yang terkirim', '');
  const t0 = Date.now();
  await guest.getByPlaceholder('Budi').fill('Budi');
  await guest.getByRole('radio', { name: '500rb' }).tap();
  await guest.screenshot({ path: `${OUT}1-tamu-sebelum.png` });
  const overflow = await guest.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  say(overflow <= 0, 'E3 halaman tamu muat di lebar 360 px tanpa geser samping', `lebih ${overflow}px`);
  await guest.getByRole('button', { name: 'Geser untuk memberi' }).tap();
  await guest.getByText('Terkirim.').waitFor({ timeout: 60_000 });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  say(+secs <= 20, 'E4 tamu baru memberi dari HP ≤ 20 detik, akun uji dibuat otomatis, tanda tangan di browser', `${secs} dtk`);
  await guest.waitForTimeout(2200);
  await guest.screenshot({ path: `${OUT}2-tamu-terkirim.png` });
  const proof = await guest.getByRole('link', { name: /Lihat bukti transaksi/ }).getAttribute('href');
  say(/nearblocks\.io\/txns\//.test(proof ?? ''), 'E5 tamu mendapat tautan bukti transaksi', proof ?? '');

  // 3. the host's book updates by itself
  await host.getByText('Budi', { exact: true }).waitFor({ timeout: 20_000 });
  await host.getByText(/baru saja/).waitFor({ timeout: 5_000 });
  say(true, 'E6 buku tuan rumah bertambah sendiri tanpa muat ulang', await host.getByText(/baru saja/).innerText());
  await host.waitForTimeout(1200);
  await host.screenshot({ path: `${OUT}3-buku-tuan-rumah.png`, fullPage: true });

  // 4. a non-holder sees the lock, not the book
  await guest.goto(`${URL_BASE}/#/buku/${id}`);
  await guest.getByText(/Amplop ini milik Siti/).waitFor({ timeout: 15_000 });
  const leak = await guest.getByRole('button', { name: 'Tarik dana bebas' }).count();
  say(leak === 0, 'E7 bukan pemegang hanya melihat kunci, tanpa daftar dan tombol tarik', '');
  await guest.screenshot({ path: `${OUT}4-bukan-pemegang.png` });

  // 5. two years later: Budi opens his own hajatan, Siti's amplop rings
  await guest.goto(`${URL_BASE}/#/buka`);
  await guest.getByPlaceholder('Siti & Andi').fill(`Budi & Rina ${stamp}`);
  await guest.getByRole('button', { name: 'Buka amplop' }).tap();
  await guest.waitForURL(/#\/buku\/\d+/, { timeout: 60_000 });
  await host.getByText('Amplop berbunyi').waitFor({ timeout: 20_000 });
  say(true, 'E8 amplop Siti berbunyi sesudah Budi membuka hajatan', '');
  await host.waitForTimeout(1800);
  await host.screenshot({ path: `${OUT}5-amplop-berbunyi.png`, fullPage: true });
  await host.getByRole('button', { name: 'Kirim balasan' }).click();
  await host.getByText(/tertaut ke pemberiannya dulu/).waitFor({ timeout: 60_000 });
  say(true, 'E9 balasan satu ketuk terkirim ke amplop Budi', '');
  await guest.getByText('Siti', { exact: true }).waitFor({ timeout: 20_000 });
  say(true, 'E10 balasan muncul di buku Budi tanpa muat ulang', '');
  await guest.waitForTimeout(1200);
  await guest.screenshot({ path: `${OUT}6-buku-budi.png`, fullPage: true });

  // 6. withdraw
  await host.getByRole('button', { name: 'Tarik dana bebas' }).click();
  await host.getByText(/masuk ke akunmu/).waitFor({ timeout: 60_000 });
  say(true, 'E11 tuan rumah menarik dana bebas', await host.getByText(/masuk ke akunmu/).innerText());

  say(errors.length === 0, 'E12 tidak ada error di konsol browser', errors.slice(0, 3).join(' ; '));
} catch (e) {
  say(false, 'alur berhenti', String(e).split('\n').slice(0, 3).join(' '));
  await host.screenshot({ path: `${OUT}gagal-host.png` }).catch(() => {});
  await guest.screenshot({ path: `${OUT}gagal-tamu.png` }).catch(() => {});
  if (errors.length) console.log(errors.join('\n'));
} finally {
  await browser.close();
}

const report = `Uji end-to-end ${URL_BASE}\n${new Date().toISOString()}\n${lines.join('\n')}\n`;
writeFileSync(`${OUT}laporan.txt`, report);
process.exit(failed ? 1 : 0);
