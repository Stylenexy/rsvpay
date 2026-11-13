import { writeFileSync } from 'node:fs';
import { KeyPair } from 'near-api-js';
import { describe, expect, it } from 'vitest';
import { NearAmplopClient, type KeyStore } from './near';

// The holder gate against the deployed contract: a fresh account opens an envelope, proves it holds it with a
// NEP-413 signature by a key the chain lists for it, and the gate stays shut for a wrong key and a wrong envelope.
// Makes one throwaway account through NEAR's public testnet helper.
//   LIVE=1 npx vitest run src/chain/holder.live.test.ts
function memoryStore(): KeyStore & { force(id: string, secret: string): void } {
  const keys: Record<string, string> = {};
  let active: string | null = null;
  return {
    keys: () => ({ ...keys }),
    saveKey: (id, secret) => {
      keys[id] = secret;
    },
    active: () => active,
    setActive: (id) => {
      active = id;
    },
    force(id, secret) {
      keys[id] = secret;
      active = id;
    },
  };
}

describe.skipIf(!process.env.LIVE)('the holder gate on the live network', () => {
  it('opens for the holder\'s own key and stays shut otherwise', async () => {
    const store = memoryStore();
    const client = new NearAmplopClient(undefined, store);
    const host = await client.createAccount('gatecheck');
    const opened = await client.openHajatan({ title: 'Holder gate check', date: 'check', seedBps: 500, depositYocto: (5n * 10n ** 22n).toString() });
    const token = opened.value;

    const proof = await client.proveHolder(token);

    const forged = memoryStore();
    forged.force(host, KeyPair.fromRandom('ed25519').toString());
    const wrongKey = await new NearAmplopClient(undefined, forged).proveHolder(token);

    const notHers = await client.proveHolder('1');
    const owner1 = (await client.hajatan('1'))?.owner_id;

    const lines = [
      `Holder gate check on ${client.contractId}, ${new Date().toISOString()}`,
      `host ${host} opened envelope #${token} (tx ${opened.txHash})`,
      `${proof?.accountId === host ? 'PASS' : 'FAIL'} | the holder's own key, listed on chain, signs a NEP-413 message that verifies | key ${proof?.publicKey ?? '-'}; message "${proof?.message ?? '-'}"`,
      `${wrongKey === null ? 'PASS' : 'FAIL'} | the same account name with a key the chain does not list stays shut`,
      `${notHers === null ? 'PASS' : 'FAIL'} | the host's real key on envelope #1, held by ${owner1}, stays shut`,
    ];
    writeFileSync(new URL('../../../docs/evidence/holder-gate-check.txt', import.meta.url), lines.join('\n') + '\n');
    expect(proof?.accountId).toBe(host);
    expect(wrongKey).toBeNull();
    expect(notHers).toBeNull();
  }, 180_000);
});
