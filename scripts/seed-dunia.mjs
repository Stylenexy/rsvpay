// Seeds the demo book judges land on: "Maya & Leo" with six gifts from six guests, paid from the testnet purse.
// Prints the token id for frontend/src/brand.ts. Run: node scripts/seed-dunia.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { Account, JsonRpcProvider, KeyPair, nearToYocto, teraToGas } = require('near-api-js');

const CONTRACT = 'rsvpay.testnet';
const provider = new JsonRpcProvider({ url: 'https://test.rpc.fastnear.com' });
const purse = JSON.parse(readFileSync(fileURLToPath(new URL('.dana.json', import.meta.url)), 'utf8'));
const dana = new Account(purse.accountId, provider, purse.secret);
const run = Date.now().toString(36).slice(-4);

async function child(name, near) {
  const key = KeyPair.fromRandom('ed25519');
  const id = `${name}-${run}.${purse.accountId}`;
  await dana.createAccount({ newAccountId: id, publicKey: key.getPublicKey(), nearToTransfer: nearToYocto(near) });
  return new Account(id, provider, key.toString());
}
const call = (account, methodName, args, deposit) => account.callFunction({ contractId: CONTRACT, methodName, args, gas: teraToGas('100'), deposit, waitUntil: 'FINAL' });

const host = await child('maya', '1');
const { token_id: id } = await call(host, 'open_hajatan', { title: 'Maya & Leo', date: '2026-12-12', seed_bps: 500 }, nearToYocto('0.1'));
console.log(`book ${id}, host ${host.accountId}`);

const gifts = [
  ['daniel', '0.5', 'To a lifetime of happy days'],
  ['priya', '0.3', 'So happy for you both'],
  ['elena', '0.25', 'Wishing you love and laughter'],
  ['omar', '0.2', 'Congratulations, you two'],
  ['mei', '0.25', 'May every year be better than the last'],
  ['sam', '1', 'Congrats Maya! See you at ours one day'],
];
for (const [name, near, message] of gifts) {
  const guest = await child(name, String(+near + 0.25));
  await call(guest, 'give', { token_id: id, message }, nearToYocto(near) + nearToYocto('0.003'));
  console.log(`  ${name} gave ${near} NEAR`);
}
console.log(`DEMO_TOKEN = '${id}'`);
process.exit(0);
