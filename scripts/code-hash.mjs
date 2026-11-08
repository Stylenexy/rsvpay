// Is the code on chain this source? Hash a local wasm the way NEAR does (sha256, base58)
// and compare it with the code hash of the deployed account. No dependencies.
//   node scripts/code-hash.mjs contracts/target/wasm32-unknown-unknown/release/amplop_balas.wasm [rsvpay-v2.testnet]
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const [file, account = 'rsvpay-v2.testnet'] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/code-hash.mjs <wasm> [account]');
  process.exit(2);
}
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const base58 = (bytes) => {
  let n = BigInt('0x' + Buffer.from(bytes).toString('hex'));
  let out = '';
  while (n > 0n) {
    out = ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = '1' + out;
  }
  return out;
};
const digest = createHash('sha256').update(readFileSync(file)).digest();
const local = base58(digest);
const res = await fetch(process.env.NEAR_RPC ?? 'https://rpc.testnet.fastnear.com', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'query', params: { request_type: 'view_account', finality: 'final', account_id: account } }),
});
const body = await res.json();
const chain = body.result?.code_hash;
console.log(`local wasm   sha256 ${digest.toString('hex')}`);
console.log(`local wasm   base58 ${local}`);
console.log(`${account} code_hash ${chain ?? JSON.stringify(body.error ?? body).slice(0, 200)} (block ${body.result?.block_height ?? '?'})`);
console.log(local === chain ? 'MATCH: the code on chain is this build' : 'DIFFERENT: this build is not the code on chain');
process.exit(local === chain ? 0 : 1);
