// A guest saves their key on one phone and brings the same account back on another.
//   node e2e/kunci.e2e.mjs https://rsvpay.vercel.app
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowser } from './browser.mjs';

const BASE = (process.argv[2] ?? 'https://rsvpay.vercel.app').replace(/\/$/, '');
const browser = await openBrowser();
const results = [];
const lines = [];
const say = (ok, name, detail = '') => { results.push(ok); const l = `${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ` | ${detail}` : ''}`; lines.push(l); console.log(l); };
const open = async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  await context.addInitScript(() => localStorage.setItem('amplop-lang', 'en'));
  return { context, page: await context.newPage() };
};
const stamp = Date.now().toString(36).slice(-4);

const first = await open();
await first.page.goto(`${BASE}/#/buka`);
await first.page.locator('.open-page input').first().fill(`Key test ${stamp}`);
await first.page.locator('.open-page input[type=date]').fill('2026-12-12');
if (await first.page.locator('.open-page input').count() > 2) await first.page.locator('.open-page input').nth(2).fill('Maya');
await first.page.locator('.open-page button[type=submit]').click();
await first.page.waitForURL(/#\/buku\/\d+/, { timeout: 90_000 });
const id = first.page.url().match(/#\/buku\/(\d+)/)[1];
const account = await first.page.evaluate(() => localStorage.getItem('amplop.akun'));
say(!!account, 'a new guest account opens an envelope', `#${id} by ${account}`);

const [download] = await Promise.all([first.page.waitForEvent('download', { timeout: 15_000 }), first.page.getByRole('button', { name: 'Save my key' }).click()]);
const file = join(tmpdir(), download.suggestedFilename()) // a real key: never inside the repo;
await download.saveAs(file);
const saved = JSON.parse(readFileSync(file, 'utf8'));
say(saved.kind === 'rsvpay-key' && saved.accountId === account && saved.network === 'testnet', 'Save my key downloads a key file for that account', download.suggestedFilename());
await first.context.close();

const second = await open();
await second.page.goto(`${BASE}/#/buku/${id}`);
await second.page.locator('.acct').waitFor();
say(await second.page.evaluate(() => localStorage.getItem('amplop.akun')) === null, 'a fresh phone starts with no account');
const broken = join(tmpdir(), 'rsvpay-broken-key.json');
writeFileSync(broken, JSON.stringify({ ...saved, secret: 'ed25519:5'.padEnd(96, 'z') }));
await second.page.locator('.acct-keys input[type=file]').setInputFiles(broken);
await second.page.getByText('This file does not open an account here.').waitFor({ timeout: 20_000 });
say(await second.page.evaluate(() => localStorage.getItem('amplop.akun')) === null, 'a key that does not match the account is refused');
await second.page.locator('.acct-keys input[type=file]').setInputFiles(file);
await second.page.getByText('Account restored on this device.').waitFor({ timeout: 20_000 });
say((await second.page.locator('.acct .tok').innerText()).includes(account), 'Restore a key brings the same account back', account);
say(await second.page.evaluate(() => localStorage.getItem('amplop.akun')) === account, 'the restored account is the one that signs');
await second.context.close();

writeFileSync(new URL('../../docs/evidence/key-restore-check.txt', import.meta.url), [`Key save and restore on ${BASE}, ${new Date().toISOString()}`, ...lines, ''].join('\n'));
await browser.close();
console.log(results.every(Boolean) ? 'PASS | key save and restore' : `FAIL | ${results.filter((ok) => !ok).length} checks`);
process.exit(results.every(Boolean) ? 0 : 1);
