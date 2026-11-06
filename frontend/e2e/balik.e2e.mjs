// Leave the landing from the very bottom, come back three ways, and the landing must be whole each time.
import { chromium } from 'playwright-core';

const BASE = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '');
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await context.newPage();
const errors = [];
const results = [];
page.on('pageerror', (error) => errors.push(error.message.slice(0, 160)));
const say = (ok, name, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ` | ${detail}` : ''}`); };

const landed = async () => {
  await page.locator('[data-load].done').waitFor({ state: 'attached', timeout: 60000 });
  await page.mouse.move(3, 760);
  await page.mouse.wheel(0, 10);
  await page.waitForTimeout(900);
};
const toBottom = async () => {
  const end = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), end);
  await page.waitForTimeout(1900);
};
const check = async (name) => {
  const hero = await page.evaluate(() => {
    const cs = (s) => getComputedStyle(document.querySelector(s));
    return { nav: Math.round(document.querySelector('.hz-nav').getBoundingClientRect().top), hz: Math.round(document.querySelector('.hz').getBoundingClientRect().top), sky: cs('.ch-sky').visibility, skyOpacity: +cs('.ch-sky').opacity, past: document.querySelector('.hz-page').className };
  });
  say(hero.nav === 0 && hero.hz === 0, `${name}: story fills the screen`, JSON.stringify({ nav: hero.nav, hz: hero.hz }));
  say(hero.sky === 'hidden' || hero.skyOpacity < .05, `${name}: chapter sky stays off the story`, `${hero.sky} ${hero.skyOpacity}`);
  say(hero.past === 'hz-page', `${name}: no leftover page state`, hero.past);
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(300);
  const stops = await page.evaluate(async () => {
    const out = {};
    const go = async (selector, at) => {
      const element = document.querySelector(selector);
      window.scrollTo({ top: element.getBoundingClientRect().top + scrollY + at * (element.offsetHeight - innerHeight), behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 1500));
    };
    await go('.ch-table', .3);
    out.panels = +getComputedStyle(document.querySelector('.cp-row')).opacity;
    await go('.ch-round', .2);
    out.letter = +getComputedStyle(document.querySelector('.round-letter')).opacity;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 1800));
    out.bottomSky = getComputedStyle(document.querySelector('.ch-sky')).visibility;
    out.bottomMorning = getComputedStyle(document.querySelectorAll('.ch-sky > img')[3]).visibility;
    return out;
  });
  say(stops.panels > .9, `${name}: wedding panels are visible`, String(stops.panels));
  say(stops.letter > .9, `${name}: first letter is visible`, String(stops.letter));
  say(stops.bottomSky === 'visible' && stops.bottomMorning === 'visible', `${name}: morning sky holds at the very bottom`, `${stops.bottomSky} ${stops.bottomMorning}`);
};

// the closing page must look the same arriving from above and coming back up from the footer
const closing = async () => page.evaluate(async () => {
  const close = document.querySelector('.ch-close');
  window.scrollTo({ top: close.getBoundingClientRect().top + scrollY + innerHeight * .5, behavior: 'instant' });
  await new Promise((r) => setTimeout(r, 1500));
  const opacity = (s) => +getComputedStyle(document.querySelector(s)).opacity;
  return { envelope: opacity('.close-envelope'), words: opacity('.close-content'), stage: opacity('.close-stage') };
});
const shown = (o) => o.envelope > .95 && o.words > .95 && o.stage > .95;
await page.goto(`${BASE}/`, { waitUntil: 'load' });
await landed();
const down = await closing();
say(shown(down), 'closing page is whole on the way down', JSON.stringify(down));
await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
await page.waitForTimeout(1800);
const up = await closing();
say(shown(up), 'closing page is whole on the way back up', JSON.stringify(up));

await page.goto(`${BASE}/`, { waitUntil: 'load' });
await landed();
await toBottom();
await page.locator('.hz-cta').click();
await page.waitForTimeout(1200);
say(await page.evaluate(() => scrollY) === 0, 'the app page opens at its top');
await page.locator('a.brand').click();
await landed();
await check('logo');

await page.locator('.hz-cta').click();
await page.waitForTimeout(1200);
await page.goBack();
await landed();
await check('back button');

// the case that broke for real: someone made an envelope, so this device now has an account
await page.goto(`${BASE}/?mock#/buka`, { waitUntil: 'load' });
await page.waitForTimeout(900);
await page.locator('.open-page input').first().fill('Siti dan Andi');
await page.locator('.open-page input[type=date]').fill('2026-12-12');
await page.locator('.open-page input').nth(2).fill('Siti');
await page.locator('.open-page button[type=submit]').click();
await page.waitForTimeout(1600);
await page.locator('a.brand').click();
await landed();
await check('after making an envelope');
const past = await page.evaluate(() => ({ extra: document.querySelectorAll('.hz-page ~ main').length, end: document.documentElement.scrollHeight - document.querySelector('.ch-footer').getBoundingClientRect().bottom - scrollY }));
say(past.extra === 0 && Math.abs(past.end) < 2, 'nothing below the footer', JSON.stringify(past));

for (let i = 0; i < 18; i++) {
  await page.evaluate(() => { location.hash = '#/buka'; });
  await page.waitForTimeout(120);
  await page.evaluate(() => { location.hash = '#/'; });
  await page.waitForTimeout(260);
}
await landed();
await page.waitForTimeout(800);
say(await page.evaluate(() => { const gl = document.querySelector('.hz-gl').getContext('webgl2'); return !!gl && !gl.isContextLost(); }), 'still drawing after 18 returns');
say(!errors.length, 'no page errors', errors[0] ?? '');

await context.close();
await browser.close();
console.log(results.every(Boolean) ? 'PASS | landing survives every way back' : `FAIL | ${results.filter((ok) => !ok).length} checks`);
process.exit(results.every(Boolean) ? 0 : 1);
