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
/** a reply carries the same amount as the gift it answers, so it only adds what its own entry costs */
export const REPLY_MARGIN_YOCTO = (YOCTO_PER_NEAR * 2n) / 1000n; // 0,002 NEAR

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

/** Play money reads as dollars outside Indonesian, at Rp1.000 = $1, so a gift looks like a gift to any reader. */
export const currency = (locale = 'id-ID') => (locale === 'id-ID' ? 'Rp' : '$');
const shown = (rp: number, locale: string) => (locale === 'id-ID' ? rp : rp / 1000);

/** "Rp500.000" or "$500" (no space) */
export function formatRp(rp: number, locale = 'id-ID'): string {
  return currency(locale) + formatter(locale).format(Math.round(shown(rp, locale)));
}

/** digits only, for the two-tone display where the currency is drawn separately */
export function formatRpDigits(rp: number, locale = 'id-ID'): string {
  return formatter(locale).format(Math.round(shown(rp, locale)));
}

/** chip label: 100rb, 250rb, 1jt */
export function shortRp(rp: number, locale = 'id-ID'): string {
  if (locale !== 'id-ID') return formatRp(rp, locale);
  return rp >= 1_000_000 ? `${rp / 1_000_000}jt` : `${rp / 1000}rb`;
}
