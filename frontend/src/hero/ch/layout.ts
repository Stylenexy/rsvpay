import { clamp, ease, lerp, seg } from '../math';

export function orbitFrame(width: number, height: number, progress: number) {
  const tilt = ease(seg(progress, .78, .93));
  return {
    tilt,
    angle: (76 + 14 * tilt) * Math.PI / 180,
    centerX: lerp(.56, .5, tilt),
    centerY: lerp(.42, 96 / height, tilt),
    scale: width <= 760 ? Math.min(1, width / height * 1.35) : 1,
  };
}

export const particleCount = (phone: boolean, lowPower: boolean) => Math.floor(32000 / (lowPower ? 3 : phone ? 2 : 1));

// One holds while the next arrives; complementary weights never leave a black gap.
export function proofFrame(progress: number) {
  const position = clamp((progress - .04) / .17, 0, 4);
  const slot = Math.floor(position);
  const change = ease(seg(position - slot, .7, 1));
  return { slot, change, weights: Array.from({ length: 5 }, (_, i) => i === slot ? 1 - change : i === slot + 1 ? change : 0) };
}

export function orbitCardFrame(width: number, height: number, titleTop: number, angle: number) {
  const phone = width <= 760;
  const cardWidth = Math.min(phone ? 240 : 260, width * (phone ? .72 : .47), Math.max(0, titleTop - 120) * 960 / 680);
  const cardHeight = cardWidth * 680 / 960;
  const top = 104 + cardHeight / 2;
  const bottom = Math.max(top, titleTop - 16 - cardHeight / 2);
  const center = Math.max(top, Math.min(height * .42, bottom));
  const radius = Math.min(height * .055, center - top, bottom - center);
  return { width: cardWidth, x: width * .5 + Math.cos(angle) * Math.max(0, width * (phone ? .46 : .36) - cardWidth / 2), y: center - Math.sin(angle) * radius };
}

export function cultureFrame(progress: number) {
  const span = .84 / 5;
  const slot = Math.min(4, Math.floor(progress / span));
  const local = clamp((progress - slot * span) / span);
  return { slot, local, change: slot < 4 ? ease(seg(local, .65, 1)) : 0 };
}
