import { Frames } from './frames';
import { BEAT, clamp, ease, lerp, seg, win } from './math';
import { createScene } from './scene';
import type { HeroCopy } from './copy';

const HD = 188;
const PHONE = 94;

/** Fade windows of each big line: [in from, in to, out from, out to]. */
const BEATS = [
  [-1, 0, 0.19, 0.225],
  [0.235, 0.29, 0.42, 0.455],
  [0.47, 0.52, 0.66, 0.7],
  [0.715, 0.76, 0.855, 0.875],
  [0.93, 0.975, 2, 3],
];

/** Video time for a story position: the morning lingers, then the day goes down during the two years. */
function videoAt(p: number) {
  if (p < 0.44) return lerp(0, 0.3, p / 0.44);
  return lerp(0.3, 1, seg(p, 0.44, 0.72));
}

/** Dark ink on the pale morning, light text after it. The swap happens between two lines, so no line is read mid-change. */
function inkAt(p: number) {
  return ease(seg(p, 0.445, 0.475));
}

const START = new Date(2026, 10, 21).getTime();
const WEDDING = new Date(2028, 10, 18).getTime();

// Opening the audio device blocks for a moment, so it happens behind the loader, never on the ring.
let bellContext: AudioContext | undefined;
function warmBell() {
  if (!bellContext && window.AudioContext) bellContext = new AudioContext();
}

function bell() {
  const ctx = bellContext;
  if (!ctx) return;
  void ctx.resume();
  const now = ctx.currentTime;
  [
    [880, 0.2],
    [1320, 0.12],
    [1760, 0.06],
  ].forEach(([f, g], i) => {
    const o = ctx.createOscillator();
    const v = ctx.createGain();
    o.frequency.value = f;
    v.gain.setValueAtTime(0, now + i * 0.04);
    v.gain.linearRampToValueAtTime(g, now + i * 0.04 + 0.01);
    v.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    o.connect(v).connect(ctx.destination);
    o.start(now + i * 0.04);
    o.stop(now + 1.7);
  });
}

export function mountHero(root: HTMLElement, copy: () => HeroCopy) {
  const pin = root.parentElement as HTMLElement;
  const page = pin.parentElement as HTMLElement;
  const canvas = root.querySelector('canvas') as HTMLCanvasElement;
  const $ = <T extends HTMLElement>(s: string) => root.querySelector(s) as T;
  const $$ = (s: string) => [...root.querySelectorAll<HTMLElement>(s)];

  const narrow = () => window.innerWidth < 760;
  const low = narrow() || (navigator.hardwareConcurrency ?? 8) <= 4;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const base = import.meta.env.BASE_URL;
  const phoneSet = window.innerWidth < 760;
  const count = phoneSet ? PHONE : HD;
  const folder = phoneSet ? 'hp' : 'hd';
  const frames = new Frames((i) => `${base}langit/${folder}/${String(i + 1).padStart(3, '0')}.webp`, count, phoneSet ? 1 : 2);

  let scene: ReturnType<typeof createScene>;
  try {
    scene = createScene(canvas, low);
  } catch {
    root.classList.add('hz-nogl');
    root.style.backgroundImage = `url(${base}langit/${folder}/${String(Math.round(count * 0.7)).padStart(3, '0')}.webp)`;
    root.querySelector('[data-load]')?.classList.add('done');
    return () => frames.dispose();
  }

  // ---- one source of truth: the scroll position inside the pinned section
  let target = 0;
  let cur = 0;
  let selfTop = -1;
  const range = () => Math.max(1, pin.offsetHeight - window.innerHeight * 1.9);
  const pinTop = () => pin.getBoundingClientRect().top + window.scrollY;
  const setTarget = (p: number) => {
    target = clamp(p);
    selfTop = Math.round(pinTop() + target * range());
    window.scrollTo({ top: selfTop, behavior: 'instant' });
  };
  const onScroll = () => {
    // while the story plays it owns the scroll position; only a real gesture hands it back
    if (auto) return;
    const y = window.scrollY;
    if (Math.abs(y - selfTop) < 3) return;
    target = clamp((y - pinTop()) / range());
  };

  // ---- autoplay: walks through every beat to the end, holds so each can be read, longest at the ring
  type Auto = { from: number; to: number; t: number; dur: number; hold: number; next: number[] };
  let auto: Auto | null = null;
  const walk = (from: number, stops: number[]): Auto | null => {
    if (!stops.length) return null;
    const to = stops[0];
    return { from, to, t: 0, dur: 1.2 + Math.abs(to - from) * 11, hold: to === BEAT.RING ? 3.4 : 1.5, next: stops.slice(1) };
  };
  const STORY = [BEAT.GIVE, BEAT.KEEP, BEAT.YEARS, BEAT.RING, BEAT.END];
  if (!reduced) auto = walk(0, STORY);
  const stepAuto = (dt: number) => {
    if (!auto) return;
    auto.t += dt;
    setTarget(lerp(auto.from, auto.to, ease(clamp(auto.t / auto.dur))));
    if (auto.t >= auto.dur + auto.hold) auto = walk(auto.to, auto.next);
  };

  // ---- hold and drag, anywhere on the stage or on the rail
  let drag: { x: number; p: number; rail: boolean } | null = null;
  let touched = false;
  const rail = $<HTMLElement>('[data-rail]');
  const railTrack = $<HTMLElement>('[data-track]');
  const atRail = (e: PointerEvent) => {
    const r = railTrack.getBoundingClientRect();
    return clamp((e.clientX - r.left) / r.width);
  };
  const onDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('a,button')) return;
    touched = true;
    root.classList.add('hz-touched');
    auto = null;
    const onRail = rail.contains(e.target as Node);
    drag = { x: e.clientX, p: onRail ? atRail(e) : target, rail: onRail };
    if (onRail) setTarget(drag.p);
    root.setPointerCapture(e.pointerId);
    root.classList.add('hz-held');
  };
  const onMove = (e: PointerEvent) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    if (!drag) return;
    setTarget(drag.rail ? atRail(e) : drag.p + (e.clientX - drag.x) / (window.innerWidth * 0.82));
  };
  const onUp = () => {
    drag = null;
    root.classList.remove('hz-held');
  };
  const onGesture = () => {
    touched = true;
    auto = null;
  };
  const onKey = (e: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) onGesture();
  };
  const onBar = (e: MouseEvent) => {
    // a press on the page itself, not on any element, is the scrollbar
    if (e.target === document.documentElement) onGesture();
  };

  const onClick = (e: MouseEvent) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-do]');
    if (!b) return;
    touched = true;
    if (b.dataset.do === 'reply') auto = walk(target, [BEAT.END]);
    if (b.dataset.do === 'replay') {
      setTarget(0);
      cur = 0;
      auto = walk(0, STORY);
    }
  };

  const stat = { draw: 0, paint: 0, n: 0 };
  const mouse = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };

  // ---- cached elements
  const beats = $$('[data-beat]');
  const bigs = beats.map((b) => b.querySelector('.hz-big') as HTMLElement);
  const smalls = beats.map((b) => b.querySelector('.hz-small') as HTMLElement);
  const cards = { gift: $('[data-card=gift]'), siti: $('[data-card=siti]'), kept: $('[data-card=kept]') };
  const nums = { gift: $('[data-num=gift]'), siti: $('[data-num=siti]'), kept: $('[data-num=kept]') };
  const ring = $<HTMLElement>('[data-ring]');
  const end = $<HTMLElement>('[data-end]');
  const fill = $<HTMLElement>('[data-fill]');
  const knob = $<HTMLElement>('[data-knob]');
  const date = $<HTMLElement>('[data-date]');
  const hintA = $<HTMLElement>('[data-hint-a]');
  const hintB = $<HTMLElement>('[data-hint-b]');
  const dots = $$('[data-dot]');
  const load = $<HTMLElement>('[data-load]');
  const loadNum = $<HTMLElement>('[data-count]');

  let W = 1;
  let H = 1;
  const resize = () => {
    W = root.clientWidth;
    H = root.clientHeight;
    scene.resize(W, H);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(root);
  resize();

  const lastText: Record<string, string> = {};
  const put = (el: HTMLElement, key: string, v: string) => {
    if (lastText[key] === v) return;
    lastText[key] = v;
    el.textContent = v;
  };
  const show = (el: HTMLElement, v: number, y = 18) => {
    el.style.opacity = v.toFixed(3);
    el.style.transform = `translate3d(0,${((1 - v) * y).toFixed(2)}px,0)`;
    el.style.visibility = v < 0.004 ? 'hidden' : 'visible';
    el.style.pointerEvents = v > 0.6 ? 'auto' : 'none';
  };

  const rp = (n: number) => (Math.round(n / 100) * 100).toLocaleString(copy().locale);

  function paint(p: number, envX: number, envY: number) {
    const c = copy();

    beats.forEach((el, i) => {
      const [a, b, x, y] = BEATS[i];
      const inn = ease(seg(p, a, b));
      const out = ease(seg(p, x, y));
      const v = inn * (1 - out);
      if (v < 0.002) {
        el.style.visibility = 'hidden';
        return;
      }
      el.style.visibility = 'visible';
      el.style.opacity = v.toFixed(3);
      el.style.transform = `translate3d(0,${((1 - inn) * 34 - out * 34).toFixed(2)}px,0)`;
      el.style.setProperty('--wipe', `${(inn * 130).toFixed(1)}%`);
      el.style.setProperty('--soft', `${((1 - v) * 8).toFixed(2)}px`);
      const r = bigs[i].getBoundingClientRect();
      bigs[i].style.setProperty('--lx', `${(envX * W - r.left).toFixed(0)}px`);
      bigs[i].style.setProperty('--ly', `${(envY * H - r.top).toFixed(0)}px`);
      smalls[i].style.opacity = ease(seg(v, 0.5, 1)).toFixed(3);
    });

    const giftV = win(p, 0.03, 0.08, 0.28, 0.33);
    const small = W < 760;
    show(cards.gift, small ? 0 : giftV);
    put(nums.gift, 'gift', rp(100000 * ease(seg(p, 0.03, 0.11))));

    const split = ease(seg(p, 0.27, 0.37));
    const paid = ease(seg(p, 0.87, 0.92));
    // the reply card takes the stage alone
    const room = 1 - win(p, 0.73, 0.76, 2, 3);
    show(cards.siti, win(p, 0.26, 0.31, 0.95, 0.98) * room);
    show(cards.kept, win(p, 0.26, 0.31, 0.95, 0.98) * room);
    put(nums.siti, 'siti', rp(95000 * split * (1 - paid)));
    put(nums.kept, 'kept', rp(5000 * split * (1 - paid)));

    show(ring, win(p, 0.77, 0.82, 0.85, 0.875), 24);
    show(end, ease(seg(p, 0.955, 0.995)), 20);

    fill.style.transform = `scaleX(${p.toFixed(4)})`;
    knob.style.left = `${(p * 100).toFixed(2)}%`;
    dots.forEach((d, i) => d.classList.toggle('on', p >= [BEAT.GIVE, BEAT.KEEP, BEAT.YEARS, BEAT.RING, BEAT.END][i] - 0.002));

    const when = new Date(lerp(START, WEDDING, ease(seg(p, 0.44, 0.72))));
    put(date, 'date', when.toLocaleDateString(c.locale, { day: 'numeric', month: 'short', year: 'numeric' }));
    if (touched && hintB.hidden) {
      hintA.hidden = true;
      hintB.hidden = false;
    }
  }

  // ---- frame loop
  let rafId = 0;
  let last = performance.now();
  let dead = false;
  const tick = (now: number) => {
    rafId = requestAnimationFrame(tick);
    const real = Math.min(0.25, (now - last) / 1000);
    const dt = Math.min(0.05, real);
    last = now;
    stepAuto(real);
    // the playhead follows the hand with a very short lag, so every in-between gets drawn
    const prev = cur;
    cur += (target - cur) * (1 - Math.exp(-dt * 11));
    if (Math.abs(target - cur) < 0.00005) cur = target;

    const close = page.querySelector<HTMLElement>('[data-close]')?.getBoundingClientRect().top ?? 1e6;
    page.style.setProperty('--ink', (close < 44 ? 0 : inkAt(cur)).toFixed(3));
    const pinEnd = pin.getBoundingClientRect().bottom;
    page.classList.toggle('hz-past', pinEnd < 70 && close >= 44);
    // past the story the sky stops drawing, so the chapters below get the whole frame
    if (pinEnd < 0) return;

    eased.x += (mouse.x - eased.x) * (1 - Math.exp(-dt * 3));
    eased.y += (mouse.y - eased.y) * (1 - Math.exp(-dt * 3));

    const v = videoAt(cur) * (count - 1);
    frames.want(v, cur - prev);
    const ai = frames.nearest(Math.floor(v), -1) ?? frames.nearest(Math.floor(v), 1);
    const bi = frames.nearest(Math.ceil(v), 1) ?? ai;
    const a = ai === null ? null : frames.bitmap(ai);
    const b = bi === null ? null : frames.bitmap(bi);
    const mix = ai !== null && bi !== null && bi > ai ? clamp((v - ai) / (bi - ai)) : 0;
    const t0 = performance.now();
    const at = scene.draw(cur, now / 1000, eased.x, eased.y, { a, b, ai: ai ?? -1, bi: bi ?? -1, mix }, narrow());
    const t1 = performance.now();
    paint(cur, at.x, at.y);
    stat.draw += t1 - t0;
    stat.paint += performance.now() - t1;
    stat.n++;

    if (cur > 0.745 && prev <= 0.745 && touched) bell();
  };

  history.scrollRestoration = 'manual';
  window.scrollTo({ top: 0, behavior: 'instant' });
  selfTop = 0;

  let ready = false;
  const need = Math.ceil(count / 8);
  void frames.load((done) => {
    if (ready || dead) return;
    loadNum.textContent = String(Math.min(100, Math.round((done / need) * 100)));
    if (done >= need) {
      ready = true;
      warmBell();
      load.classList.add('done');
      last = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('wheel', onGesture, { passive: true });
  window.addEventListener('touchmove', onGesture, { passive: true });
  window.addEventListener('keydown', onKey);
  window.addEventListener('mousedown', onBar);
  root.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  root.addEventListener('click', onClick);

  if (import.meta.env.DEV) {
    (window as unknown as { __hero: unknown }).__hero = {
      set(p: number) {
        auto = null;
        setTarget(p);
        cur = p;
      },
      get: () => ({ p: cur, target, auto: !!auto }),
      stat: () => ({ n: stat.n, draw: stat.draw / stat.n, paint: stat.paint / stat.n }),
      gpu: () => {
        const none = { a: null, b: null, ai: -1, bi: -1, mix: 0 };
        const info = scene.renderer.getContext().getExtension('WEBGL_debug_renderer_info');
        return {
          ms: scene.gpuCost(() => scene.draw(cur, 1, 0, 0, none, narrow())),
          size: [canvas.width, canvas.height],
          who: info ? scene.renderer.getContext().getParameter(info.UNMASKED_RENDERER_WEBGL) : '?',
        };
      },
      quality: (pr: number, tr: number) => {
        scene.quality(pr, tr);
        resize();
      },
    };
  }

  return () => {
    dead = true;
    cancelAnimationFrame(rafId);
    ro.disconnect();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('wheel', onGesture);
    window.removeEventListener('touchmove', onGesture);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('mousedown', onBar);
    root.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    root.removeEventListener('click', onClick);
    frames.dispose();
    scene.dispose();
  };
}
