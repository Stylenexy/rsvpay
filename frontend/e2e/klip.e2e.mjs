// Records the one-take clip: the whole story on the live site, then the envelope passed on, the old holder's
// controls gone, and the new holder's book and history. Real testnet, no edits. Every step shows its receipt link.
// Captions are drawn over the page only in the recording; the site itself is unchanged.
//   node e2e/klip.e2e.mjs [url] [out-dir]
import { mkdirSync, readdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { openBrowser } from './browser.mjs';

const URL_BASE = process.argv[2] ?? 'https://rsvpay.xyz';
const OUT = process.argv[3] ?? 'klip-out';
mkdirSync(OUT, { recursive: true });

const browser = await openBrowser();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: OUT, size: { width: 1280, height: 720 } } });
await ctx.addInitScript(() => localStorage.setItem('amplop-lang', 'en'));
const page = await ctx.newPage();
const pause = (ms) => page.waitForTimeout(ms);
async function caption(text) {
  await page.evaluate((t) => {
    let el = document.getElementById('klip-caption');
    if (!el) {
      el = document.createElement('div');
      el.id = 'klip-caption';
      el.style.cssText = 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);max-width:1100px;padding:12px 20px;border-radius:12px;background:rgba(8,12,24,.82);color:#fff;font:600 17px/1.35 system-ui,sans-serif;z-index:2147483647;pointer-events:none;text-align:center';
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}
const log = [];
const step = (s) => {
  console.log(s);
  log.push(s);
};

try {
  await page.goto(URL_BASE);
  await page.locator('.story-entry').waitFor({ timeout: 30_000 });
  await pause(1500);
  await caption('RSVPay on NEAR testnet. One button runs the whole story with real transactions.');
  await pause(1600);
  await page.locator('.story-entry').click();
  await page.waitForURL(/#\/coba$/);
  await caption('Maya opens her wedding envelope. Sam gives; a 5% share stays locked in his name.');
  await page.locator('[data-step="ring"][data-state="done"], [role="alert"]').first().waitFor({ timeout: 90_000 });
  if (await page.getByRole('alert').count()) throw new Error('account service refused; not recording a fallback');
  await caption('Two years later Sam hosts his own celebration, and Maya\'s envelope rings.');
  await pause(2200);
  await page.getByRole('button', { name: 'Give back to Sam' }).click();
  await caption('One tap: the kept share plus Maya\'s top-up land in Sam\'s envelope.');
  await page.locator('[data-story-complete]').waitFor({ timeout: 60_000 });
  await pause(900);
  await caption('Every step has a receipt on the testnet explorer.');
  await page.locator('[data-step="reply"] .txlink').first().scrollIntoViewIfNeeded();
  await pause(2200);
  step('story complete');

  await page.getByRole('link', { name: 'Open Sam’s book' }).click();
  await page.getByRole('button', { name: 'Pass the envelope on' }).waitFor({ timeout: 20_000 });
  await caption('Sam\'s book opens only after his browser signs a NEP-413 message with a key the chain lists for him.');
  await pause(2600);

  const people = await page.locator('.acct select option').evaluateAll((options) => options.map((o) => o.value));
  const current = await page.locator('.acct select').inputValue();
  const next = people.find((id) => id !== current);
  if (!next) throw new Error('second person missing');
  await page.getByRole('button', { name: 'Pass the envelope on' }).click();
  await page.getByLabel('Their trial account').fill(next);
  await caption('Sam passes the envelope on. The money, the book and the promises move with it.');
  await pause(1900);
  await page.getByRole('button', { name: `Pass it on to ${next}`, exact: true }).click();
  await page.getByText(`Now held by ${next}`, { exact: true }).waitFor({ timeout: 60_000 });
  await caption('From that block on, the old holder\'s controls are gone. The contract refuses him too.');
  await pause(2600);
  const transferTx = await page.locator('[role="status"] a.txlink').last().getAttribute('href').catch(() => null);
  step(`transfer tx link: ${transferTx}`);

  await page.locator('.acct select').selectOption(next);
  await page.getByRole('button', { name: 'Pass the envelope on' }).waitFor({ timeout: 20_000 });
  await caption('The new holder proves it is them, and the inherited book opens.');
  await pause(1900);
  const history = page.getByText('The envelope’s history', { exact: true });
  await history.waitFor();
  await history.scrollIntoViewIfNeeded();
  await caption('The envelope\'s history: gifts, the reply, and both holders, read from the chain.');
  await pause(2900);

  await caption('RSVPay: a wedding gift that remembers, and gives back. rsvpay.xyz');
  await pause(1900);
  step('done');
} catch (e) {
  step(`stopped: ${String(e).split('\n')[0]}`);
  process.exitCode = 1;
} finally {
  await ctx.close();
  await browser.close();
  const webm = readdirSync(OUT).filter((f) => f.endsWith('.webm')).map((f) => join(OUT, f));
  if (webm.length) renameSync(webm[webm.length - 1], join(OUT, 'rsvpay-one-take.webm'));
  console.log(log.join('\n'));
}
