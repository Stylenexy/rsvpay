// Issue #4: the guest's pages on small phones. For each page and screen size it checks
// sideways scroll, whether the give control is on screen without scrolling, that every
// text field is at least 16 px (iPhone zooms into smaller ones), and touch target sizes.
// Uses the rehearsal client (?mock), so it never signs anything.
//   node e2e/hp.e2e.mjs [https://rsvpay.vercel.app]
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openBrowser } from './browser.mjs';

const BASE = (process.argv[2] ?? 'https://rsvpay.vercel.app').replace(/\/$/, '');
const OUT = fileURLToPath(new URL('../../docs/evidence/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const SIZES = [
  [360, 640],
  [375, 667],
  [390, 844],
];
const PAGES = [
  ['give', '/?mock#/beri/1'],
  ['open', '/?mock#/buka'],
  ['book', '/?mock#/buku/1'],
  ['give-new', '/#/beri/1'],
];
const lines = [];
let failed = 0;
const say = (ok, name, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`;
  console.log(line);
  lines.push(line);
  if (!ok) failed++;
};

const browser = await openBrowser();
for (const lang of ['en', 'id']) {
  for (const [w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await ctx.addInitScript((l) => localStorage.setItem('amplop-lang', l), lang);
    const page = await ctx.newPage();
    for (const [name, path] of PAGES) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(900);
      const m = await page.evaluate(() => {
        const vis = (el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
        };
        const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 28);
        const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        const fields = [...document.querySelectorAll('input:not([type=hidden]):not([type=file]):not([type=radio]):not([type=checkbox]), textarea, select')]
          .filter(vis)
          .map((el) => ({ name: label(el), px: parseFloat(getComputedStyle(el).fontSize) }));
        const inText = (el) => el.tagName === 'A' && el.closest('p, li') && !el.closest('nav, header');
        const targets = [...document.querySelectorAll('button, a[href], [role=radio], [role=button], label:has(input[type=file]), select')]
          .filter(vis)
          .filter((el) => !inText(el))
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { name: label(el), w: Math.round(r.width), h: Math.round(r.height) };
          });
        const give = document.querySelector('[aria-label="Slide to give"], [aria-label="Geser untuk memberi"], .slide-give, .swipe');
        const gr = give?.getBoundingClientRect();
        const track = give?.closest('.slide')?.getBoundingClientRect();
        // what a thumb would touch along the slide: start, middle and the far end where the knob lands
        const covered = track ? [0.08, 0.5, 0.92].map((f) => document.elementFromPoint(track.left + track.width * f, track.top + track.height / 2)).filter((el) => !el?.closest('.slide')).map((el) => el?.className || el?.tagName) : [];
        return { overflow, fields, targets, covered, give: gr ? { top: Math.round(gr.top), bottom: Math.round(gr.bottom) } : null, vh: innerHeight };
      });
      const tag = `${lang} ${w}x${h} ${name}`;
      say(m.overflow <= 0, `${tag}: no sideways scroll`, `${m.overflow}px`);
      const small = m.fields.filter((f) => f.px < 16);
      say(small.length === 0, `${tag}: every text field is 16 px or more, so iPhone does not zoom`, small.length ? small.map((f) => `${f.name} ${f.px}px`).join(', ') : `${m.fields.length} fields`);
      const tiny = m.targets.filter((t) => t.w < 44 || t.h < 44);
      say(tiny.length === 0, `${tag}: every control is at least 44x44 px`, tiny.length ? tiny.map((t) => `${t.name} ${t.w}x${t.h}`).join(', ') : `${m.targets.length} controls`);
      if (name.startsWith('give')) {
        say(!!m.give && m.give.bottom <= m.vh, `${tag}: the give control is on screen without scrolling`, m.give ? `bottom ${m.give.bottom} of ${m.vh}` : 'not found');
        say(m.covered.length === 0, `${tag}: nothing floats over the slide`, m.covered.join(', '));
        if (lang === 'en' && w === 360) await page.screenshot({ path: `${OUT}hp-${name}-360.png` });
      }
    }
    await ctx.close();
  }
}
await browser.close();
writeFileSync(`${OUT}phone-check-report.txt`, [`Phone check on ${BASE}, ${new Date().toISOString()}`, ...lines, ''].join('\n'));
console.log(failed ? `FAIL | ${failed} checks` : 'PASS | phone check');
process.exit(failed ? 1 : 0);
