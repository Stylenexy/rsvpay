// Seeds one demo amplop on TESTNET so a judge or a first-time guest lands on a sky that is
// not empty: "Siti & Andi" with six gifts from six guests. Prints the token id for VITE_DEMO_TOKEN.
// Run: node seed-demo.mjs [contract-id]
// The host key goes to tools/.demo-siti.json (gitignored, testnet only) for recording the demo video.
import fs from "node:fs";
import { Account, JsonRpcProvider, KeyPair, nearToYocto, teraToGas } from "near-api-js";

const RPC = process.env.NEAR_RPC ?? "https://test.rpc.fastnear.com";
const HELPER = "https://helper.nearprotocol.com/account";
const CONTRACT = process.argv[2] ?? "amplop-c-mvznhnlx.testnet";
const provider = new JsonRpcProvider({ url: RPC });
const GAS = teraToGas("100");
const run = Date.now().toString(36).slice(-6);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function helperAccount(prefix) {
  const kp = KeyPair.fromRandom("ed25519");
  const id = `${prefix}-${run}.testnet`;
  const res = await fetch(HELPER, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ newAccountId: id, newAccountPublicKey: kp.getPublicKey().toString() }),
  });
  if (!res.ok) throw new Error(`helper ${res.status} ${await res.text()}`);
  for (let i = 0; i < 20; i++) {
    try {
      await provider.viewAccount({ accountId: id });
      break;
    } catch {
      await sleep(1500);
    }
  }
  return { account: new Account(id, provider, kp.toString()), secret: kp.toString() };
}
async function sub(parent, name, near) {
  const kp = KeyPair.fromRandom("ed25519");
  const id = `${name}.${parent.accountId}`;
  await parent.createAccount({ newAccountId: id, publicKey: kp.getPublicKey(), nearToTransfer: nearToYocto(near) });
  return new Account(id, provider, kp.toString());
}
const call = (acc, methodName, args, deposit = 0n) =>
  acc.callFunction({ contractId: CONTRACT, methodName, args, gas: GAS, deposit, waitUntil: "FINAL" });

const host = await helperAccount("siti");
const { token_id: id } = await call(host.account, "open_hajatan", { title: "Siti & Andi", date: "Sabtu, 21 November 2026", seed_bps: 500 }, nearToYocto("0.05"));
console.log(`amplop #${id} host ${host.account.accountId}`);

const root = (await helperAccount("tamu")).account;
const gifts = [
  ["hendra", "0.5", "Bahagia sampai tua"],
  ["rina", "0.3", "Barakallah"],
  ["yuli", "0.25", "Selamat menempuh hidup baru"],
  ["darto", "0.2", "Semoga rukun selalu"],
  ["maria", "0.25", "Tuhan memberkati"],
  ["budi", "1", "Selamat ya Siti!"],
];
for (const [name, near, message] of gifts) {
  const guest = await sub(root, name, String(+near + 0.15));
  await call(guest, "give", { token_id: id, message }, nearToYocto(near) + nearToYocto("0.003"));
  console.log(`  ${name} gave ${near} NEAR`);
}
fs.writeFileSync(new URL("./.demo-siti.json", import.meta.url), JSON.stringify({ accountId: host.account.accountId, secret: host.secret, token: id }, null, 2));
console.log(`VITE_DEMO_TOKEN=${id}`);
