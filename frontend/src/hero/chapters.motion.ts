import { clamp, ease, seg } from './math';

const TAU = Math.PI * 2;

/** Everything here follows the scroll position, frame by frame, the same way the time story does. */
export function mountChapters(root: HTMLElement) {
  const orbit = root.querySelector<HTMLElement>('[data-orbit]')!;
  const stage = orbit.querySelector<HTMLElement>('.ob')!;
  const cards = [...orbit.querySelectorAll<HTMLElement>('[data-card]')];
  const glass = orbit.querySelector<HTMLElement>('.ob-glass')!;
  const huge = orbit.querySelector<HTMLElement>('.ch-huge')!;
  const wipes = [...root.querySelectorAll<HTMLElement>('[data-wipe]')];
  const rises = [...root.querySelectorAll<HTMLElement>('[data-rise]')];
  const slides = [...root.querySelectorAll<HTMLElement>('[data-slide]')];
  const names = root.querySelector<HTMLElement>('[data-names]')!;

  let turn = 0;
  let raf = 0;
  let last = performance.now();

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const vh = window.innerHeight;

    const o = orbit.getBoundingClientRect();
    if (o.bottom > -vh && o.top < vh * 2) {
      const want = clamp(-o.top / (orbit.offsetHeight - vh));
      turn += (want - turn) * (1 - Math.exp(-dt * 9));
      const w = stage.clientWidth / 2;
      const h = stage.clientHeight / 2;
      cards.forEach((c, i) => {
        // one full rotation over the section; the card at the front is the one being read
        const a = turn * TAU + (i * TAU) / 3 + Math.PI / 2;
        const near = (Math.sin(a) + 1) / 2;
        const x = Math.cos(a) * w;
        const y = Math.sin(a) * h;
        const s = 0.68 + 0.42 * near;
        c.style.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), 0) scale(${s.toFixed(3)})`;
        c.style.opacity = (0.5 + 0.5 * ease(near)).toFixed(3);
        c.style.zIndex = near > 0.5 ? '4' : '1';
      });
      glass.style.transform = `translate(-50%, -50%) rotate(${(-8 + turn * 16).toFixed(2)}deg) scale(${(0.94 + 0.1 * Math.sin(turn * Math.PI)).toFixed(3)})`;
      huge.style.transform = `translate3d(0, ${((0.5 - turn) * 40).toFixed(1)}px, 0)`;
    }

    for (const el of wipes) {
      const r = el.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0) continue;
      const v = seg(vh * 0.94 - r.top, 0, vh * 0.42);
      el.style.setProperty('--wipe', `${(v * 130).toFixed(1)}%`);
    }
    for (const el of rises) {
      const r = el.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0) continue;
      const v = ease(seg(vh * 0.96 - r.top, 0, vh * 0.24));
      el.style.opacity = v.toFixed(3);
      el.style.transform = `translate3d(0, ${((1 - v) * 26).toFixed(1)}px, 0)`;
    }

    const n = names.getBoundingClientRect();
    if (n.bottom > 0 && n.top < vh) {
      const t = clamp((vh - n.top) / (n.height + vh));
      for (const el of slides) {
        const dir = Number(el.dataset.slide);
        el.style.transform = `translate3d(${(dir * (t - 0.5) * 16).toFixed(2)}vw, 0, 0)`;
      }
    }
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
