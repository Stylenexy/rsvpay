import { YOCTO_PER_NEAR } from './money';

/**
 * Demo exchange rate, shown on screen as "kurs demo". Testnet NEAR has no market price;
 * this rate only makes gift sizes read like a real kondangan. A real product would
 * take rupiah through QRIS and hold a rupiah stablecoin instead.
 */
export const RP_PER_NEAR = 500_000n;

/** gift sizes offered to a guest, in rupiah */
export const GIFT_STEPS = [100_000, 250_000, 500_000, 1_000_000] as const;

/** extra NEAR attached on top of a gift so the contract can pay the storage of the entry */
export const STORAGE_MARGIN_YOCTO = (YOCTO_PER_NEAR * 3n) / 1000n; // 0,003 NEAR

/** NEAR attached when opening a hajatan; covers the amplop's storage, the rest becomes free balance */
export const OPEN_DEPOSIT_YOCTO = (YOCTO_PER_NEAR * 5n) / 100n; // 0,05 NEAR

export function rupiahToYocto(rp: number | bigint): bigint {
  return (BigInt(rp) * YOCTO_PER_NEAR) / RP_PER_NEAR;
}

export function yoctoToRupiah(yocto: bigint | string): number {
  const v = typeof yocto === 'string' ? BigInt(yocto) : yocto;
  return Number((v * RP_PER_NEAR) / YOCTO_PER_NEAR);
}

/**
 * Rupiah shown for money read back from the chain, rounded DOWN to Rp1.000.
 * On-chain amounts carry the small storage leftover (e.g. Rp500.650); a kondangan
 * book reads in thousands, and rounding down never shows more than exists.
 */
export function chainRp(yocto: bigint | string): number {
  return Math.floor(yoctoToRupiah(yocto) / 1000) * 1000;
}

const formatter = (locale: string) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

/** "Rp500.000" (no space, Indonesian thousands dots) */
export function formatRp(rp: number, locale = 'id-ID'): string {
  return 'Rp' + formatter(locale).format(Math.round(rp));
}

/** digits only, for the two-tone display where "Rp" is drawn separately */
export function formatRpDigits(rp: number, locale = 'id-ID'): string {
  return formatter(locale).format(Math.round(rp));
}

/** chip label: 100rb, 250rb, 1jt */
export function shortRp(rp: number, locale = 'id-ID'): string {
  if (locale !== 'id-ID') return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(rp);
  return rp >= 1_000_000 ? `${rp / 1_000_000}jt` : `${rp / 1000}rb`;
}
