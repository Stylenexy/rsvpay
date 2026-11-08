import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadEnvelopeHistory } from './history';
import { NearAmplopClient } from './near';

// Reads the deployed contract's envelope #1, which was sold once and paid out, through Nearblocks v3 and testnet RPC.
//   LIVE=1 npx vitest run src/chain/history.live.test.ts
describe.skipIf(!process.env.LIVE)('envelope history on the live network', () => {
  it('finds the previous holder and the payout through the indexer', async () => {
    const client = new NearAmplopClient(undefined, { keys: () => ({}), saveKey: () => {}, active: () => null, setActive: () => {} });
    const h = (await client.hajatan('1'))!;
    const history = await loadEnvelopeHistory(client, h);
    const kinds = history.events.map((e) => e.kind);
    const report = [
      `Envelope history for ${client.contractId} #1, ${new Date().toISOString()}`,
      `source: Nearblocks v3 /nfts/${client.contractId}/tokens/1/txns, then each holder's /accounts/{holder}/txns; every row checked on archival testnet RPC`,
      `coverage: ${history.coverage}`,
      `holder now: ${h.owner_id}`,
      `events: ${kinds.join(', ')}`,
      `holders: ${history.events.filter((e) => e.kind === 'holder' || e.kind === 'opened').map((e) => e.to).join(' -> ')}`,
      `paid out (yocto): ${history.paid}`,
    ].join('\n');
    writeFileSync(new URL('../../../docs/evidence/history-source-check.txt', import.meta.url), report + '\n');
    expect(history.coverage).not.toBe('unavailable');
    expect(kinds).toContain('holder');
    expect(history.paid).not.toBeNull();
  }, 120_000);
});
