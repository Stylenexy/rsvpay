import { describe, expect, it } from 'vitest';
import { MockAmplopClient } from './mock';

const NEAR = 10n ** 24n;
const n = (x: string) => BigInt(x);

async function cycle() {
  const c = new MockAmplopClient();
  const siti = await c.createAccount('Siti');
  const { value: A } = await c.openHajatan({ title: 'Siti & Andi', date: '21 Nov 2026', seedBps: 500, depositYocto: (NEAR / 20n).toString() });
  const budi = await c.createAccount('Budi');
  await c.give({ tokenId: A, message: 'Selamat ya!', depositYocto: NEAR.toString() });
  return { c, siti, budi, A };
}

describe('mock follows the contract rules', () => {
  it('locks 5% of a gift as seed and keeps balance = free + seed', async () => {
    const { c, A } = await cycle();
    const h = (await c.hajatan(A))!;
    const [e] = await c.entries(A);
    expect(n(e.seed)).toBe((n(e.amount) * 500n) / 10000n);
    expect(n(h.balance)).toBe(n(h.free) + n(h.seed_locked));
    expect(h.seed_locked).toBe(e.seed);
  });

  it('only the holder withdraws, and withdraw never touches seeds', async () => {
    const { c, siti, A } = await cycle();
    await expect(c.withdraw(A)).rejects.toThrow('only the current holder');
    c.useAccount(siti);
    const before = (await c.hajatan(A))!;
    await c.withdraw(A);
    const after = (await c.hajatan(A))!;
    expect(after.free).toBe('0');
    expect(after.seed_locked).toBe(before.seed_locked);
  });

  it('rings when the giver opens a hajatan, and the reply releases the seed into it', async () => {
    const { c, siti, budi, A } = await cycle();
    expect(await c.pendingReplies(A)).toEqual([]);
    c.useAccount(budi);
    const { value: B } = await c.openHajatan({ title: 'Budi & Rina', date: '20 Nov 2028', seedBps: 500, depositYocto: (NEAR / 20n).toString() });
    const [p] = await c.pendingReplies(A);
    expect(p).toMatchObject({ entry: 0, giver: budi, to_token_id: B });
    c.useAccount(siti);
    const seed = n(p.seed);
    await c.reciprocate({ tokenId: A, entry: 0, toTokenId: B, message: 'Gantian ya', depositYocto: (NEAR / 2n).toString() });
    const [old] = await c.entries(A);
    const [reply] = await c.entries(B);
    expect(old.replied).toEqual({ token_id: B, entry: 0 });
    expect(reply.reply_to).toEqual({ token_id: A, entry: 0 });
    expect(n(reply.amount)).toBeGreaterThan(NEAR / 2n + seed - NEAR / 100n);
    expect((await c.hajatan(A))!.seed_locked).toBe('0');
    await expect(c.reciprocate({ tokenId: A, entry: 0, toTokenId: B, message: 'lagi', depositYocto: '0' })).rejects.toThrow('already replied');
  });
});
