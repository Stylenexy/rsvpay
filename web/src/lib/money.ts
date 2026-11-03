/** Money helpers. All amounts are BigInt yoctoNEAR internally (1 NEAR = 10^24). */

export const YOCTO_PER_NEAR = 10n ** 24n;

/**
 * Parse what a person typed ("1", "1,5", "0.25") into yoctoNEAR.
 * Returns null for anything that is not a plain non-negative number.
 */
export function parseNear(input: string): bigint | null {
  const text = input.trim().replace(',', '.');
  const match = /^(\d+)(?:\.(\d{1,24}))?$/.exec(text);
  if (!match) return null;
  const whole = BigInt(match[1]);
  const frac = (match[2] ?? '').padEnd(24, '0');
  return whole * YOCTO_PER_NEAR + BigInt(frac || '0');
}

export interface FormatOptions {
  maxDecimals?: number;
  /**
   * 'down' for money a person will receive (never promise more than exists),
   * 'up' for money a person will pay (never promise less than is charged).
   */
  round?: 'down' | 'up';
}

/**
 * Show yoctoNEAR as NEAR with an Indonesian decimal comma, no thousands separator.
 * Never rounds to a misleading zero: a tiny positive amount reads "kurang dari 0,0001".
 */
export function formatNear(yocto: bigint | string, options: FormatOptions = {}): string {
  const { maxDecimals = 4, round = 'down' } = options;
  const value = typeof yocto === 'string' ? BigInt(yocto) : yocto;
  const unit = 10n ** BigInt(24 - maxDecimals);
  let q = value / unit;
  if (round === 'up' && value % unit !== 0n) q += 1n;

  if (q === 0n && value > 0n) {
    return `kurang dari 0,${'0'.repeat(maxDecimals - 1)}1`;
  }
  const scale = 10n ** BigInt(maxDecimals);
  const whole = q / scale;
  const frac = (q % scale).toString().padStart(maxDecimals, '0').replace(/0+$/, '');
  return frac ? `${whole},${frac}` : `${whole}`;
}
