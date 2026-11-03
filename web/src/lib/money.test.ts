import { describe, expect, it } from 'vitest';
import { formatNear, parseNear, YOCTO_PER_NEAR } from './money';

describe('parseNear', () => {
  it('parses whole, comma and dot decimals', () => {
    expect(parseNear('1')).toBe(YOCTO_PER_NEAR);
    expect(parseNear('1,5')).toBe((YOCTO_PER_NEAR * 3n) / 2n);
    expect(parseNear('0.0068')).toBe((YOCTO_PER_NEAR * 68n) / 10000n);
  });
  it('rejects junk, negatives and too many decimals', () => {
    expect(parseNear('')).toBeNull();
    expect(parseNear('abc')).toBeNull();
    expect(parseNear('-1')).toBeNull();
    expect(parseNear('1.2.3')).toBeNull();
    expect(parseNear('1.' + '1'.repeat(25))).toBeNull();
  });
});

describe('formatNear', () => {
  it('uses a decimal comma and trims zeros', () => {
    expect(formatNear(YOCTO_PER_NEAR)).toBe('1');
    expect(formatNear((YOCTO_PER_NEAR * 3n) / 2n)).toBe('1,5');
    expect(formatNear((YOCTO_PER_NEAR * 68n) / 10000n)).toBe('0,0068');
  });
  it('rounds down for received money and up for paid money', () => {
    const v = parseNear('1.00009')!;
    expect(formatNear(v, { round: 'down' })).toBe('1');
    expect(formatNear(v, { round: 'up' })).toBe('1,0001');
  });
  it('never shows a misleading zero', () => {
    expect(formatNear(1n)).toBe('kurang dari 0,0001');
    expect(formatNear(0n)).toBe('0');
  });
});
