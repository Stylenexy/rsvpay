import { describe, expect, it } from 'vitest';
import { cultureFrame, roundFrame } from './layout';

const samples = Array.from({ length: 1001 }, (_, i) => i / 1000);

describe('the reply chapter', () => {
  it('never has two letters out at once', () => {
    for (const p of samples) expect(roundFrame(p).rises.filter(r => r > 0).length).toBeLessThanOrEqual(1);
  });

  it('turns the envelope only while every letter is inside', () => {
    for (const p of samples) {
      const { rises, turn } = roundFrame(p);
      if (turn % 1 !== 0) expect(Math.max(...rises)).toBe(0);
    }
  });

  it('shows each letter fully, in order', () => {
    expect(roundFrame(.18).rises).toEqual([1, 0, 0]);
    expect(roundFrame(.54).rises).toEqual([0, 1, 0]);
    expect(roundFrame(1).rises).toEqual([0, 0, 1]);
  });

  it('ends with two full turns and the last year lit', () => {
    expect(roundFrame(1)).toMatchObject({ turn: 2, year: 2, fill: 1 });
  });

  it('moves without a jump', () => {
    for (let i = 1; i < samples.length; i++) {
      const a = roundFrame(samples[i - 1]);
      const b = roundFrame(samples[i]);
      expect(Math.abs(b.turn - a.turn)).toBeLessThan(.04);
      a.rises.forEach((r, n) => expect(Math.abs(b.rises[n] - r)).toBeLessThan(.04));
    }
  });
});

describe('the five envelopes', () => {
  it('gives each envelope the stage alone before the change starts', () => {
    for (let i = 0; i < 5; i++) expect(cultureFrame(.168 * i + .08)).toMatchObject({ slot: i, change: 0, finale: 0 });
  });

  it('never moves more than one scene at a time', () => {
    for (const p of samples) {
      const { slot, change } = cultureFrame(p);
      expect(slot).toBeLessThanOrEqual(4);
      expect(change).toBeGreaterThanOrEqual(0);
      if (slot === 4) expect(change).toBe(0);
    }
  });

  it('clears the last envelope before the five arrive', () => {
    for (const p of samples) {
      const { clear, finale } = cultureFrame(p);
      if (finale > 0) expect(clear).toBe(1);
    }
  });

  it('ends with all five together, then clears the stage', () => {
    expect(cultureFrame(.92)).toMatchObject({ slot: 4, finale: 1, leave: 0 });
    expect(cultureFrame(1).leave).toBe(1);
  });
});
