import { clamp, ease, seg } from '../math';

// One letter at a time: it rises, holds and sinks, and the envelope only turns while no letter is out.
const LETTERS = [[.02, .1, .24, .31], [.39, .47, .6, .67], [.75, .83, 2, 3]];
const TURNS = [[.31, .39], [.67, .75]];

export function roundFrame(progress: number) {
  const p = clamp(progress);
  const rises = LETTERS.map(([a, b, c, d]) => ease(seg(p, a, b)) * (1 - ease(seg(p, c, d))));
  const turn = TURNS.reduce((sum, [a, b]) => sum + ease(seg(p, a, b)), 0);
  const year = p < .35 ? 0 : p < .71 ? 1 : 2;
  return { rises, turn, year, fill: ease(seg(p, .02, .83)) };
}

// Each envelope holds the stage alone, then the five meet. Only two scenes are ever awake at once.
export function cultureFrame(progress: number) {
  const p = clamp(progress);
  const span = .84 / 5;
  const slot = Math.min(4, Math.floor(p / span));
  const local = clamp((p - slot * span) / span);
  // the last envelope has left before the five arrive, so the two never overlap
  return { slot, local, change: slot < 4 ? ease(seg(local, .62, 1)) : 0, clear: ease(seg(p, .84, .875)), finale: ease(seg(p, .875, .915)), leave: ease(seg(p, .95, 1)) };
}
