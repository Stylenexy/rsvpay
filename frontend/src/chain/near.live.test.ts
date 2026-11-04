import { describe, expect, it } from 'vitest';
import { NearAmplopClient, type KeyStore } from './near';

/**
 * ITM-A2 live check: the exact client the web uses, against the keyless testnet contract.
 * Runs only with LIVE=1 (makes throwaway testnet accounts through the public helper; play money).
 *   LIVE=1 npx vitest run src/chain/near.live.test.ts
 */
const LIVE = process.env.LIVE === '1';
const NEAR = 10n ** 24n;

function memoryStore(): KeyStore {
  const keys: Record<string, string> = {};
  let active: string | null = null;
  return {
    keys: () => ({ ...keys }),
    saveKey: (id, s) => {
      keys[id] = s;
    },
    active: () => active,
    setActive: (id) => {
      active = id;
    },
  };
}

describe.skipIf(!LIVE)('web client on testnet', () => {
  it(
    'opens, gives, rings, replies, withdraws',
    async () => {
      const c = new NearAmplopClient(undefined, memoryStore());
      const log = (s: string) => console.log(s);

      const siti = await c.createAccount('Siti');
      const open = await c.openHajatan({ title: 'Siti & Andi (uji web)', date: 'Sabtu, 21 November 2026', seedBps: 500, depositYocto: (NEAR / 20n).toString() });
      const A = open.value;
      log(`open   #${A} by ${siti} tx=${open.txHash}`);
      expect((await c.hajatan(A))!.owner_id).toBe(siti);

      const budi = await c.createAccount('Budi');
      const gift = await c.give({ tokenId: A, message: 'Selamat ya Siti!', depositYocto: (NEAR + (NEAR * 3n) / 1000n).toString() });
      const [e] = await c.entries(A, gift.value, 1);
      log(`give   entry ${gift.value} by ${budi} amount=${e.amount} seed=${e.seed} tx=${gift.txHash}`);
      expect(e.giver).toBe(budi);
      expect(BigInt(e.seed)).toBe((BigInt(e.amount) * 500n) / 10000n);
      expect(await c.pendingReplies(A)).toEqual([]);

      const own = await c.openHajatan({ title: 'Budi & Rina (uji web)', date: 'Jumat, 20 November 2028', seedBps: 500, depositYocto: (NEAR / 20n).toString() });
      const B = own.value;
      const [p] = await c.pendingReplies(A);
      log(`ring   pending ${JSON.stringify(p)}`);
      expect(p).toMatchObject({ entry: gift.value, giver: budi, to_token_id: B });

      c.useAccount(siti);
      const rest = BigInt(p.amount) - BigInt(p.seed);
      const rep = await c.reciprocate({ tokenId: A, entry: p.entry, toTokenId: B, message: 'Gantian ya, Budi', depositYocto: (rest + (NEAR * 3n) / 1000n).toString() });
      const [r] = await c.entries(B, rep.value, 1);
      log(`reply  entry ${rep.value} in #${B} amount=${r.amount} tx=${rep.txHash}`);
      expect(r.reply_to).toEqual({ token_id: A, entry: p.entry });
      expect((await c.entries(A, p.entry, 1))[0].replied).toEqual({ token_id: B, entry: rep.value });

      const wd = await c.withdraw(A);
      const after = (await c.hajatan(A))!;
      log(`withdraw tx=${wd.txHash} free=${after.free} seed_locked=${after.seed_locked}`);
      expect(after.free).toBe('0');
      expect(c.explorerTx(wd.txHash!)).toContain(wd.txHash!);
    },
    240_000,
  );
});
