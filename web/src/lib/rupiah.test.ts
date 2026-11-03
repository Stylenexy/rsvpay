import { describe, expect, it } from 'vitest';
import { YOCTO_PER_NEAR } from './money';
import { chainRp, formatRp, rupiahToYocto, shortRp, yoctoToRupiah } from './rupiah';

describe('rupiah demo rate', () => {
  it('converts both ways at the demo rate', () => {
    expect(rupiahToYocto(500_000)).toBe(YOCTO_PER_NEAR);
    expect(rupiahToYocto(250_000)).toBe(YOCTO_PER_NEAR / 2n);
    expect(yoctoToRupiah(YOCTO_PER_NEAR * 2n)).toBe(1_000_000);
    expect(yoctoToRupiah((YOCTO_PER_NEAR / 1000n).toString())).toBe(500);
  });
  it('rounds chain amounts down to Rp1.000', () => {
    expect(chainRp((YOCTO_PER_NEAR * 10013n) / 10000n)).toBe(500_000);
    expect(chainRp(rupiahToYocto(25_999))).toBe(25_000);
  });
  it('formats like an Indonesian price tag', () => {
    expect(formatRp(42_350_000)).toBe('Rp42.350.000');
    expect(shortRp(250_000)).toBe('250rb');
    expect(shortRp(1_000_000)).toBe('1jt');
  });
});
