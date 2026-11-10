// Puts the contract built from THIS commit on a local NEAR chain, the way it sits on testnet:
// a fresh account, the wasm, `new`, then every access key deleted. No testnet, no faucet.
// The chain is near-sandbox (the node near-workspaces drives), already listening on NEAR_RPC.
//   node sandbox.mjs <validator_key.json> <amplop_balas.wasm> <root-out.json>
// It writes <root-out.json> = { accountId, secret } of the sandbox's own root account, which exists
// only on that throwaway chain. attacks.mjs and long-settle.mjs read it through ATTACK_ROOT:
//   NEAR_RPC=http://127.0.0.1:3030 ATTACK_ROOT=<root-out.json> node attacks.mjs rsvpay.test.near
// The CI workflow .github/workflows/sandbox.yml runs exactly that on every push.
import fs from "node:fs";
import { createHash } from "node:crypto";
import { Account, JsonRpcProvider, KeyPair, nearToYocto, teraToGas } from "near-api-js";

const RPC = process.env.NEAR_RPC ?? "http://127.0.0.1:3030";
const [keyFile, wasmFile, outFile] = process.argv.slice(2);
if (!keyFile || !wasmFile || !outFile) {
  console.error("usage: node sandbox.mjs <validator_key.json> <amplop_balas.wasm> <root-out.json>");
  process.exit(2);
}
if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(RPC)) {
  console.error(`NEAR_RPC is ${RPC}: this script only deploys to a local chain`);
  process.exit(2);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const provider = new JsonRpcProvider({ url: RPC });
const validator = JSON.parse(fs.readFileSync(keyFile, "utf8"));
const root = new Account(validator.account_id, provider, validator.secret_key);

const id = `rsvpay.${validator.account_id}`;
const key = KeyPair.fromRandom("ed25519");
await root.createAccount({ newAccountId: id, publicKey: key.getPublicKey(), nearToTransfer: nearToYocto("50") });
const contract = new Account(id, provider, key.toString());

const wasm = fs.readFileSync(wasmFile);
await contract.deployContract(wasm);
await contract.callFunction({ contractId: id, methodName: "new", args: {}, gas: teraToGas("30"), waitUntil: "FINAL" });

// give up every key, as the testnet deployment did: from here on nobody can change this contract either
for (const k of (await contract.getAccessKeyList()).keys) await contract.deleteKey(k.public_key);
let keys = 1;
for (let i = 0; i < 10 && keys > 0; i++) {
  await sleep(1000);
  keys = (await provider.viewAccessKeyList({ accountId: id })).keys.length;
}

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const base58 = (bytes) => {
  let n = BigInt("0x" + Buffer.from(bytes).toString("hex"));
  let out = "";
  while (n > 0n) {
    out = ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
};
const local = base58(createHash("sha256").update(wasm).digest());
const res = await fetch(RPC, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "query", params: { request_type: "view_account", finality: "optimistic", account_id: id } }),
});
const onChain = (await res.json()).result?.code_hash;

console.log(`contract      ${id} on ${RPC}`);
console.log(`wasm          ${wasmFile} (${wasm.length} bytes)`);
console.log(`code hash     ${onChain} on the local chain, ${local} from the file`);
console.log(`access keys   ${keys}`);
if (onChain !== local || keys !== 0) {
  console.error("FAIL | the local chain does not hold this wasm with zero keys");
  process.exit(1);
}
fs.writeFileSync(outFile, JSON.stringify({ accountId: validator.account_id, secret: validator.secret_key }));
console.log(`PASS | ${id} holds this commit's wasm and has zero access keys`);
