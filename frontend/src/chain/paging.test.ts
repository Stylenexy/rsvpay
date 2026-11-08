import { describe, expect, it } from 'vitest';
import { tooHeavy, walkPages } from './paging';

// A fake view: rows 0..total-1, and any page that contains a "heavy" row costs one unit per row
// plus `heavy` per heavy row; the RPC refuses pages that cost more than `budget`.
const view = (heavy: Set<number>, budget: number, weight = 40) => {
  const calls: Array<[number, number]> = [];
  const page = async (from: number, limit: number) => {
    calls.push([from, limit]);
    let cost = 0;
    for (let i = from; i < from + limit; i++) cost += heavy.has(i) ? weight : 1;
    if (cost > budget) throw new Error('wasm execution failed with error: HostError(GasLimitExceeded)');
    return Array.from({ length: limit }, (_, k) => from + k);
  };
  return { page, calls };
};

describe('reading the rings of a big book', () => {
  it('reads an ordinary book in pages of 100', async () => {
    const { page, calls } = view(new Set(), 1000);
    const { rows, skipped } = await walkPages(250, page);
    expect(rows).toEqual(Array.from({ length: 250 }, (_, i) => i));
    expect(skipped).toEqual([]);
    expect(calls).toEqual([[0, 100], [100, 100], [200, 50]]);
  });

  it('splits a page that is too heavy and still returns every row', async () => {
    const heavy = new Set(Array.from({ length: 300 }, (_, i) => i));
    const { page } = view(heavy, 1000, 24);
    const { rows, skipped } = await walkPages(300, page);
    expect(rows).toHaveLength(300);
    expect(skipped).toEqual([]);
  });

  it('skips only a single row that can never be read, and keeps the rest', async () => {
    const { page } = view(new Set([7]), 50, 1000);
    const { rows, skipped } = await walkPages(20, page);
    expect(skipped).toEqual([7]);
    expect(rows).toEqual(Array.from({ length: 20 }, (_, i) => i).filter((i) => i !== 7));
  });

  it('does not swallow errors that are not about gas', async () => {
    await expect(walkPages(10, async () => { throw new Error('network down'); })).rejects.toThrow('network down');
    expect(tooHeavy(new Error('Exceeded the prepaid gas.'))).toBe(true);
    expect(tooHeavy(new Error('429 Too Many Requests'))).toBe(false);
  });
});
