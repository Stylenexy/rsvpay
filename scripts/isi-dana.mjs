// Fills the testnet purse behind /api/dana: asks the public helper for fresh accounts and sweeps each one into the purse.
//   node scripts/isi-dana.mjs [rounds]
// Testnet only. The purse's key stays in scripts/.dana.json, which git ignores.
import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { Account, JsonRpcProvider, KeyPair, actions } = require('near-api-js');

const FILE = fileURLToPath(new URL('.dana.json', import.meta.url));
const HELPER = 'https://helper.nearprotocol.com/account';
const provider = new JsonRpcProvider({ url: 'https://test.rpc.fastnear.com' });
const rounds = Number(process.argv[2] ?? 8);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fresh(id) {
  const key = KeyPair.fromRandom('ed25519');
  const res = await fetch(HELPER, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ newAccountId: id, newAccountPublicKey: key.getPublicKey().toString() }) });
  if (!res.ok) throw new Error(`helper ${res.status}: ${(await res.text()).slice(0, 120)}`);
  for (let i = 0; i < 24; i++) {
    try {
      await provider.viewAccount({ accountId: id });
      return key.toString();
    } catch {
      await sleep(1200);
    }
  }
  throw new Error(`${id} did not appear`);
}

let purse = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : null;
if (!purse) {
  const accountId = `rsvpay-dana-${Date.now().toString(36).slice(-4)}.testnet`;
  purse = { accountId, secret: await fresh(accountId) };
  writeFileSync(FILE, JSON.stringify(purse));
  console.log('purse', accountId);
}

for (let i = 0; i < rounds; i++) {
  const id = `dana-${Date.now().toString(36).slice(-6)}.testnet`;
  try {
    const secret = await fresh(id);
    const account = new Account(id, provider, secret);
    await account.signAndSendTransaction({ receiverId: id, actions: [actions.deleteAccount(purse.accountId)], waitUntil: 'FINAL' });
    console.log('swept', id);
  } catch (error) {
    console.log('stopped:', String(error.message).slice(0, 120));
    break;
  }
  await sleep(1500);
}

const { amount } = await provider.viewAccount({ accountId: purse.accountId });
console.log('purse balance', (Number(BigInt(amount) / 10n ** 21n) / 1000).toFixed(2), 'NEAR');
process.exit(0);
