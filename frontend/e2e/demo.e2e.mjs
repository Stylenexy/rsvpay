// The floating guide, the finished-step notes, the language pill, the steady heading, and the demo that runs itself to the end.
//   node e2e/demo.e2e.mjs [url]
import { openBrowser } from './browser.mjs';

const BASE = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '');
const SHOTS = process.env.SHOTS;
const browser = await openBrowser();
const results = [];
const errors = [];
const say = (ok, name, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ` | ${detail}` : ''}`); };
const open = async (viewport, extra = {}) => {
  const context = await browser.newContext({ viewport, ...extra });
  await context.addInitScript(() => localStorage.setItem('amplop-lang', 'en'));
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message.slice(0, 160)));
  return { context, page };
};

const { context, page } = await open({ width: 1366, height: 768 });
const shot = (tab, name) => (SHOTS ? tab.screenshot({ path: `${SHOTS}/${name}.png` }) : null);
const layout = () => page.evaluate(() => {
  const y = (s) => Math.round(document.querySelector(s).getBoundingClientRect().top + scrollY);
  return { form: y('.form-panel'), letter: y('.letter'), line: y('.story-line'), height: document.documentElement.scrollHeight };
});

await page.goto(`${BASE}/?mock#/buka`, { waitUntil: 'load' });
await page.locator('.guide-pill').waitFor();
await page.waitForTimeout(1600);
const resting = await layout();

await page.locator('.guide-pill').hover();
await page.waitForTimeout(600);
say(await page.locator('.guide-panel').evaluate((e) => +getComputedStyle(e).opacity) > .95, 'hovering opens the guide');
say(JSON.stringify(await layout()) === JSON.stringify(resting), 'opening the guide moves nothing', JSON.stringify(resting));
say(await page.evaluate(() => getComputedStyle(document.querySelector('.guide')).position) === 'fixed', 'the guide floats');
await shot(page, 'guide-open');
await page.mouse.move(700, 500);
await page.waitForTimeout(800);
say(await page.locator('.guide-panel').evaluate((e) => getComputedStyle(e).visibility) === 'hidden', 'leaving closes the guide');

const heading = await page.locator('.envelope-story h1').innerText();
await page.locator('.open-page input').first().fill('Siti dan Andi');
await page.locator('.open-page input[type=date]').fill('2026-12-12');
await page.waitForTimeout(800);
say(await page.locator('.envelope-story h1').innerText() === heading, 'the heading keeps its words while typing', heading.replace(/\s+/g, ' '));
say(await page.locator('.letter-names').inputValue() === 'Siti dan Andi', 'the names are written on the envelope');
say(JSON.stringify(await layout()) === JSON.stringify(resting), 'typing moves nothing');
await shot(page, 'names-typed');

const pill = () => page.evaluate(() => { const box = document.querySelector('.app-languages'); const p = box.querySelector('.lang-pill').getBoundingClientRect(); return { x: Math.round(p.left), width: Math.round(p.width), chosen: box.querySelector('[aria-pressed="true"]').textContent, peek: box.hasAttribute('data-peek') }; });
const atRest = await pill();
await page.locator('.app-languages button').nth(3).hover();
await page.waitForTimeout(500);
const peeking = await pill();
const under = await page.locator('.app-languages button').nth(3).boundingBox();
say(Math.abs(peeking.x - under.x) < 2 && peeking.x !== atRest.x, 'the pill slides to the hovered language', `${atRest.x} to ${peeking.x}`);
say(peeking.chosen === atRest.chosen && peeking.peek && await page.locator('.envelope-story h1').innerText() === heading, 'hovering does not change the language', peeking.chosen);
await shot(page, 'language-hover');
await page.mouse.move(400, 500);
await page.waitForTimeout(500);
say((await pill()).x === atRest.x, 'the pill returns when the pointer leaves');

await page.locator('.open-page input[type=date]').fill('2026-12-12');
if (await page.locator('.open-page input').count() > 2) await page.locator('.open-page input').nth(2).fill('Siti');
await page.locator('.open-page button[type=submit]').click();
await page.locator('.guide-bubble').waitFor({ timeout: 9000 });
await page.waitForTimeout(600);
const bubble = (await page.locator('.guide-bubble').innerText()).replace(/\s+/g, ' ');
say(bubble.includes('Step 1 done') && bubble.includes('Time for step 2'), 'finishing step 1 says what comes next', bubble);
await shot(page, 'step-1-done');
await page.locator('.guide-bubble a').click();
await page.locator('.give-card .knob').waitFor();
await page.locator('.give-card .knob').press('Enter');
await page.locator('.done').waitFor({ timeout: 9000 });
await page.waitForTimeout(500);
const given = (await page.locator('.guide-bubble').innerText()).replace(/\s+/g, ' ');
say(given.includes('Step 2 done') && given.includes('Time for step 3'), 'giving says what comes next', given);
await page.locator('.guide-bubble a').click();
await page.locator('.list li:not(.empty)').waitFor({ timeout: 9000 });
await page.waitForTimeout(500);
const kept = (await page.locator('.guide-bubble').innerText()).replace(/\s+/g, ' ');
say(kept.includes('Step 3 done') && kept.includes('Time for step 4'), 'the book says what comes next', kept);

await page.locator('.guide-pill').hover();
await page.waitForTimeout(600);
await page.getByRole('button', { name: 'Show me, step by step' }).click();
await page.locator('.tour-card').waitFor({ timeout: 15000 });

const watch = async (tab, label) => {
  const seen = [];
  const started = Date.now();
  let moments = 0;
  for (;;) {
    const line = await tab.locator('.tour-card .guide-who').innerText().catch(() => '');
    const text = line.replace(/\s+/g, ' ').trim();
    if (text && !seen.includes(text)) { seen.push(text); await shot(tab, `${label}-${++moments}`); }
    if (text.includes('Demo finished') || Date.now() - started > 100000) break;
    await tab.waitForTimeout(250);
  }
  return { seen, seconds: Math.round((Date.now() - started) / 1000) };
};

const desktop = await watch(page, 'demo');
say(desktop.seen.length >= 7 && desktop.seen.at(-1).includes('Demo finished'), `the demo runs to the end in ${desktop.seconds} s`, desktop.seen.at(-1));
say(await page.locator('.reply-card').count() === 1, 'the demo ends on the gift that came back');
say(await page.getByRole('button', { name: 'Stop the demo' }).count() === 0, 'the finished card offers ways on, not a stop');
await shot(page, 'demo-finished');
await page.locator('.tour-card .btn').first().click();
await page.waitForURL((url) => !url.search.includes('tour'), { timeout: 9000 });
say(await page.locator('.tour-card').count() === 0, 'leaving the demo leaves rehearsal mode', page.url().replace(BASE, ''));
await context.close();

const phone = await open({ width: 360, height: 740 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await phone.page.goto(`${BASE}/?mock&tour=1#/buka`, { waitUntil: 'load' });
await phone.page.locator('.tour-card').waitFor({ timeout: 15000 });
const small = await watch(phone.page, 'phone');
say(small.seen.at(-1).includes('Demo finished'), `the demo finishes on a phone in ${small.seconds} s`, small.seen.at(-1));
const overflow = await phone.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
say(overflow <= 0, 'no sideways scroll on a phone', String(overflow));
await phone.context.close();

// the floating guide must never sit on the one button the whole story waits for
for (const [label, viewport, extra] of [['laptop', { width: 1366, height: 768 }, {}], ['phone', { width: 360, height: 740 }, { isMobile: true, hasTouch: true }]]) {
  const story = await open(viewport, extra);
  await story.page.goto(`${BASE}/?mock#/coba`, { waitUntil: 'load' });
  await story.page.locator('[data-step="ring"][data-state="done"]').waitFor({ timeout: 60000 });
  await story.page.getByRole('button', { name: 'Give back to Sam' }).click({ timeout: 8000 });
  await story.page.locator('[data-story-complete]').waitFor({ timeout: 30000 });
  say(true, `the story button stays reachable on a ${label}`);
  await story.context.close();
}

say(!errors.length, 'no page errors', errors[0] ?? '');
await browser.close();
console.log(results.every(Boolean) ? 'PASS | guide and demo' : `FAIL | ${results.filter((ok) => !ok).length} checks`);
process.exit(results.every(Boolean) ? 0 : 1);
