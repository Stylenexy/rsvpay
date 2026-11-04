/** Pure timeline maths for the hero. Everything on screen is a function of p (0..1), so dragging back replays it exactly. */

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0 before a, 1 after b, linear between. */
export const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
export const ease = (t: number) => t * t * (3 - 2 * t);
export const easeOut = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t);
/** Fades in over a..b and out over c..d. */
export const win = (p: number, a: number, b: number, c: number, d: number) =>
  ease(seg(p, a, b)) * (1 - ease(seg(p, c, d)));

/** Catmull-Rom through keyed rows [p, v1, v2, ...]; continuous speed, so no visible stops at keys. */
export function track(keys: number[][], p: number): number[] {
  const n = keys.length;
  if (p <= keys[0][0]) return keys[0].slice(1);
  if (p >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (i < n - 2 && p > keys[i + 1][0]) i++;
  const k1 = keys[i];
  const k2 = keys[i + 1];
  const k0 = keys[Math.max(0, i - 1)];
  const k3 = keys[Math.min(n - 1, i + 2)];
  const h = k2[0] - k1[0];
  const t = (p - k1[0]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const out: number[] = [];
  for (let c = 1; c < k1.length; c++) {
    // tangents scaled by the key spacing, so uneven keys do not overshoot
    const m1 = ((k2[c] - k0[c]) / Math.max(1e-4, k2[0] - k0[0])) * h;
    const m2 = ((k3[c] - k1[c]) / Math.max(1e-4, k3[0] - k1[0])) * h;
    out.push(
      (2 * t3 - 3 * t2 + 1) * k1[c] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * k2[c] + (t3 - t2) * m2,
    );
  }
  return out;
}

/** Story beats on the timeline; autoplay stops at RING and waits for the click. */
export const BEAT = { GIVE: 0.13, KEEP: 0.36, YEARS: 0.6, RING: 0.84, END: 1 } as const;
