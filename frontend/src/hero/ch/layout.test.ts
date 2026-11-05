import { describe, expect, it } from 'vitest';
import { cardFocus, roundFrame } from './layout';

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

describe('the culture gallery', () => {
  it('focuses the card at the middle of the screen', () => {
    expect(cardFocus(500, 0, 1000, 300)).toBe(1);
    expect(cardFocus(1200, 0, 1000, 300)).toBe(0);
  });

  it('follows the track', () => {
    expect(cardFocus(1200, -700, 1000, 300)).toBe(1);
  });
});
