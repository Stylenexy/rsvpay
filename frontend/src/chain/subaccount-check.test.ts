import { it, expect } from 'vitest';
import { NearAmplopClient, type KeyStore } from './near';

// Opt-in: LIVE_SUBACCOUNT=1. One helper account and one native transaction; no contract call.
// Keys exist only in memory, and are never printed or written.
it.skipIf(process.env.LIVE_SUBACCOUNT !== '1')('checks only the new finalized native sub-account funding call on testnet', async () => {
  const keys: Record<string, string> = {};
  let active: string | null = null;
  const store: KeyStore = { keys: () => ({ ...keys }), saveKey: (id, key) => { keys[id] = key; }, active: () => active, setActive: (id) => { active = id; } };
  const client = new NearAmplopClient(undefined, store);
  const parent = await client.createAccount('Siti');
  const start = performance.now();
  const child = await client.createSubAccount('Budi', '400000000000000000000000');
  expect(child.value.endsWith('.' + parent)).toBe(true);
  expect(client.account()).toBe(child.value);
  expect(await client.balance(child.value)).toBe('400000000000000000000000');
  console.log(JSON.stringify({ check: 'native sub-account funding only', parent, child: child.value, txHash: child.txHash, fundingYocto: '400000000000000000000000', elapsedMs: Math.round(performance.now() - start) }));
}, 90_000);
