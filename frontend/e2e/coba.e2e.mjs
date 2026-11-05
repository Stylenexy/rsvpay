// Manual real-testnet check. Not part of Vitest; never run automatically.
// node e2e/coba.e2e.mjs [url]
// One helper request, a child funded by the first account, and a human-shaped pause at the ring.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const URL_BASE = process.argv[2] ?? 'http://localhost:5173';

const OUT = fileURLToPath(new URL('../../docs/evidence/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const lines = [];
let failed = 0;
const check = (ok, name, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`;
  console.log(line); lines.push(line); if (!ok) failed++;
};
const browser = await chromium.connectOverCDP(process.env.CDP ?? 'http://127.0.0.1:9333');
const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 } });
await ctx.addInitScript(() => localStorage.setItem('amplop-lang', 'en'));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let helpers = 0;
page.on('request', (r) => { if (r.url() === 'https://helper.nearprotocol.com/account' && r.method() === 'POST') helpers++; });

try {
  await page.goto(URL_BASE);
  const start = Date.now();
  await page.locator('.story-entry').click();
  await page.waitForURL(/#\/coba$/);
  await page.locator('[data-step="ring"][data-state="done"], [role="alert"]').first().waitFor({ timeout: 90_000 });
  if (await page.getByRole('alert').count()) {
    check(helpers === 1, 'one helper attempt on refusal', String(helpers));
    await page.getByRole('button', { name: 'View recorded run' }).click();
    await page.locator('[data-recording]').waitFor();
    check(await page.locator('[data-recording] .txlink').count() === 4, 'fallback contains four explicitly recorded receipts');
    check((await page.locator('[data-recording]').innerText()).includes('past run, not this visit'), 'recording cannot be mistaken for this visit');
    throw new Error('Live story unverified: account service or network refused; recording checked separately.');
  }
  check(helpers === 1, 'one public helper call for both families', String(helpers));
  check(await page.locator('[data-step="family"] .txlink').count() === 1, 'child-account funding has a real receipt');
  check(await page.locator('.story-timeline .txlink').count() === 4, 'funding, opening, gift and second opening each have a receipt');
  await page.waitForTimeout(1200);
  check(await page.locator('[data-step="reply"][data-state="done"]').count() === 0, 'the reply waits for a tap');
  await page.screenshot({ path: `${OUT}coba-ring.png`, fullPage: true });
  await page.getByRole('button', { name: 'Give back to Budi' }).click();
  await page.locator('[data-story-complete]').waitFor({ timeout: 60_000 });
  const seconds = (Date.now() - start) / 1000;
  check(seconds <= 60, 'whole story including the pause in 60 seconds', `${seconds.toFixed(1)} s`);
  check(await page.locator('[data-step="reply"] .txlink').count() === 1, 'reply has a real receipt');
  check(helpers === 1, 'no second helper request while replying');
  await page.screenshot({ path: `${OUT}coba-reply.png`, fullPage: true });
  await page.getByRole('link', { name: 'Open Budi’s book' }).click();
  await page.getByRole('button', { name: 'Pass the envelope on' }).waitFor({ timeout: 20_000 });
  for (const [width, height] of [[1366, 768], [1440, 860], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const bounds = await page.locator('.envelope-story').evaluate((story) => {
      const rect = (selector) => story.querySelector(selector).getBoundingClientRect();
      const name = rect('h1'), date = rect('.story-date'), image = rect('.envelope-float'), line = rect('.story-line');
      return { separated: name.bottom <= date.top && date.bottom <= image.top && image.bottom <= line.top,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    check(bounds.separated && bounds.overflow <= 0, `book layout at ${width}x${height}`, JSON.stringify(bounds));
    await page.screenshot({ path: `${OUT}coba-book-${width}.png` });
  }
  const people = await page.locator('.acct select option').evaluateAll((options) => options.map((o) => o.value));
  const current = await page.locator('.acct select').inputValue();
  const next = people.find((id) => id !== current);
  if (!next) throw new Error('Second person missing');
  await page.getByRole('button', { name: 'Pass the envelope on' }).click();
  await page.getByLabel('Their trial account').fill(next);
  check((await page.locator('.pass-envelope').innerText()).includes('You lose access'), 'confirmation explains loss of access');
  await page.getByRole('button', { name: `Pass it on to ${next}`, exact: true }).click();
  await page.getByText(`Now held by ${next}`, { exact: true }).waitFor({ timeout: 60_000 });
  check(await page.getByRole('button', { name: 'Take your gifts' }).count() === 0, 'old keeper loses controls');
  await page.locator('.acct select').selectOption(next);
  await page.getByRole('button', { name: 'Pass the envelope on' }).waitFor({ timeout: 20_000 });
  await page.getByText('The envelope’s history', { exact: true }).waitFor();
  check(true, 'new keeper can open the inherited book and history');
  check(errors.length === 0, 'no browser errors', errors.join('; '));
} catch (e) {
  check(false, 'flow stopped', String(e).split('\n').slice(0, 3).join(' '));
  await page.screenshot({ path: `${OUT}coba-failed.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  writeFileSync(`${OUT}coba-e2e-report.txt`, `Manual testnet run: ${URL_BASE}\n${new Date().toISOString()}\n${lines.join('\n')}\n`);
}
process.exit(failed ? 1 : 0);
