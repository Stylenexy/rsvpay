/**
 * Reads a long list from a view in pages. A page the RPC refuses for gas is split in half, down to
 * one row; a single row that still cannot be read is skipped and reported, so one heavy giver
 * (someone holding dozens of envelopes, see docs/evidence/scale-report.txt) cannot hide every
 * other ring in the book. Once a smaller page works, the page size grows back.
 */
export async function walkPages<T>(
  total: number,
  page: (from: number, limit: number) => Promise<T[]>,
  start = 100,
): Promise<{ rows: T[]; skipped: number[] }> {
  const rows: T[] = [];
  const skipped: number[] = [];
  let from = 0;
  let limit = start;
  while (from < total) {
    const n = Math.min(limit, total - from);
    try {
      rows.push(...(await page(from, n)));
      from += n;
      limit = Math.min(start, limit * 2);
    } catch (e) {
      if (!tooHeavy(e)) throw e;
      if (n === 1) {
        skipped.push(from);
        from += 1;
      } else {
        limit = Math.max(1, Math.floor(n / 2));
      }
    }
  }
  return { rows, skipped };
}

/** The RPC answers a view that burns more than its gas limit with GasLimitExceeded. */
export function tooHeavy(e: unknown): boolean {
  return /GasLimitExceeded|Exceeded the (maximum amount of gas|prepaid gas)/i.test(String((e as Error)?.message ?? e));
}
