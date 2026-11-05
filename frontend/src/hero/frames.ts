/** Sky image sequence. Compressed frames stay in memory; only those near the playhead are decoded. */

const KEEP = 30;
const DECODING = 5;

export class Frames {
  readonly count: number;
  private url: (i: number) => string;
  private step: number;
  private blobs: (Blob | null)[];
  private decoded = new Map<number, ImageBitmap>();
  private pending = new Set<number>();
  private dead = false;

  constructor(url: (i: number) => string, count: number, step = 1) {
    this.url = url;
    this.count = count;
    this.step = step;
    this.blobs = new Array(count).fill(null);
  }

  /** Every 8th frame first, so the sky can move before the rest arrive. */
  async load(onProgress: (done: number) => void) {
    const order: number[] = [];
    for (let s = 8; s >= this.step; s = s >> 1) {
      for (let i = 0; i < this.count; i += s) if (!order.includes(i)) order.push(i);
    }
    let done = 0;
    let next = 0;
    const worker = async () => {
      while (next < order.length && !this.dead) {
        const i = order[next++];
        try {
          const r = await fetch(this.url(i));
          this.blobs[i] = await r.blob();
        } catch {
          // a missing frame only means the neighbours are blended for longer
        }
        onProgress(++done);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
  }

  private decode(i: number) {
    const blob = this.blobs[i];
    if (!blob || this.pending.has(i) || this.decoded.has(i) || this.pending.size >= DECODING) return;
    this.pending.add(i);
    createImageBitmap(blob, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' })
      .then((b) => {
        this.pending.delete(i);
        if (this.dead) return b.close();
        this.decoded.set(i, b);
      })
      .catch(() => this.pending.delete(i));
  }

  /** Keeps frames around index decoded, drops those furthest away. */
  want(index: number, direction: number) {
    const dir = direction >= 0 ? 1 : -1;
    // nearest first, then ahead in the direction of travel, so the next frame is ready before it is needed
    const at = Math.round(index);
    for (const o of [0, 1, -1, dir * 2, dir * 3, -dir * 2, dir * 4, dir * 6, dir * 8, dir * 10, dir * 12]) {
      const i = at + o;
      if (i >= 0 && i < this.count) this.decode(i);
    }
    if (this.decoded.size > KEEP) {
      const far = [...this.decoded.keys()].sort((a, b) => Math.abs(b - index) - Math.abs(a - index));
      for (const i of far.slice(0, this.decoded.size - KEEP)) {
        this.decoded.get(i)?.close();
        this.decoded.delete(i);
      }
    }
  }

  /** Closest decoded frame at or before (dir -1) or after (dir 1) index. */
  nearest(index: number, dir: 1 | -1): number | null {
    for (let d = 0; d < this.count; d++) {
      const i = index + d * dir;
      if (i >= 0 && i < this.count && this.decoded.has(i)) return i;
    }
    return null;
  }

  bitmap(i: number) {
    return this.decoded.get(i) ?? null;
  }

  dispose() {
    this.dead = true;
    for (const b of this.decoded.values()) b.close();
    this.decoded.clear();
  }
}
