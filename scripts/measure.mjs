// Reads the proof transactions and the contract state from testnet RPC and prints the numbers
// behind the "Measured on testnet" table in the README. Read-only: no keys, no accounts.
// Run: node measure.mjs (older transactions may need an archival RPC in RPC=...)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const RPC = process.env.RPC ?? 'https://test.rpc.fastnear.com';
const CONTRACT = 'rsvpay.testnet';
const WASM = new URL('../contracts/target/wasm32-unknown-unknown/release/amplop_balas.wasm', import.meta.url);

const TXS = [
  ['open_hajatan', '9cDvqFm9hBvdZgxFrHdL5PViAvGEtev5F1ZYYnhrwdxk', 'siti-oighzb5.testnet'],
  ['give', '23fkWd22hwQKgFJc8aFxJrLpQJg42PbDaX3PwL5Ci71u', 'budi-oimtgcp.testnet'],
  ['reciprocate', '53gPm5NADLhf6xq56p7A1Z7VmCVrkc9rvV1UCxtnuAxV', 'siti-oighzb5.testnet'],
  ['withdraw', 'CVz6QvXk8Z62thL6Ed82aABjraBiCaCr3kmHxNuhSA45', 'siti-oighzb5.testnet'],
];

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (!json.result) throw new Error(JSON.stringify(json.error ?? json).slice(0, 200));
  return json.result;
}

function base58(bytes) {
  const abc = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let n = BigInt('0x' + Buffer.from(bytes).toString('hex'));
  let s = '';
  while (n > 0n) {
    s = abc[Number(n % 58n)] + s;
    n /= 58n;
  }
  return s;
}

console.log(`Measured on testnet, contract ${CONTRACT}, read ${new Date().toISOString()}`);

const q = { finality: 'final', account_id: CONTRACT };
const account = await rpc('query', { request_type: 'view_account', ...q });
const keys = await rpc('query', { request_type: 'view_access_key_list', ...q });
console.log(`access keys: ${keys.keys.length}`);
console.log(`code hash on chain: ${account.code_hash}`);
if (existsSync(WASM)) {
  console.log(`code hash of local build: ${base58(createHash('sha256').update(readFileSync(WASM)).digest())}`);
}

for (const [name, hash, sender] of TXS) {
  const tx = await rpc('tx', { tx_hash: hash, sender_account_id: sender, wait_until: 'NONE' });
  const outcomes = [tx.transaction_outcome, ...tx.receipts_outcome];
  const gas = outcomes.reduce((sum, o) => sum + o.outcome.gas_burnt, 0);
  const fee = outcomes.reduce((sum, o) => sum + BigInt(o.outcome.tokens_burnt), 0n);
  const block = await rpc('block', { block_id: tx.transaction_outcome.block_hash });
  const when = new Date(block.header.timestamp / 1e6).toISOString();
  const ok = 'SuccessValue' in tx.status ? 'ok' : 'FAILED';
  console.log(`${name} | ${ok} | ${(gas / 1e12).toFixed(2)} TGas | ${(Number(fee) / 1e24).toFixed(6)} NEAR burnt | ${when} | ${hash}`);
}
