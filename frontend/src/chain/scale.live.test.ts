import { describe, expect, it } from 'vitest';
import { NearAmplopClient, type KeyStore } from './near';

/**
 * Issue #16 live check: book #217 on rsvpay-v2.testnet holds 300 gifts from one giver who holds
 * 100 envelopes (made by scripts/scale.mjs). A single pending_replies page of 50 or more is refused
 * for gas there; the client must still read all 300 rings. Read-only.
 *   LIVE=1 npx vitest run src/chain/scale.live.test.ts
 */
const LIVE = process.env.LIVE === '1';
const BOOK = process.env.SCALE_BOOK ?? '217';
const none: KeyStore = { keys: () => ({}), saveKey: () => {}, active: () => null, setActive: () => {} };

describe.skipIf(!LIVE)('a book whose giver holds 100 envelopes', () => {
  it('still lists every ring', async () => {
    const c = new NearAmplopClient(undefined, none);
    const h = await c.hajatan(BOOK);
    const t0 = Date.now();
    const rings = await c.pendingReplies(BOOK);
    console.log(`book #${BOOK}: ${h?.entries} gifts, ${rings.length} rings read in ${Date.now() - t0} ms`);
    expect(rings).toHaveLength(h!.entries);
  }, 180_000);
});
