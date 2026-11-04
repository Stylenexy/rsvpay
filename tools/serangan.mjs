// Attacks run for real against the deployed, keyless Amplop Balas contract on NEAR TESTNET.
// A rejection counts only if the call failed AND the money did not move.
// Throwaway accounts with random in-memory keys; nothing secret is written to disk.
// Run: node serangan.mjs [contract-id]
import fs from "node:fs";
import { Account, JsonRpcProvider, KeyPair, nearToYocto, teraToGas } from "near-api-js";

const RPC = process.env.NEAR_RPC ?? "https://test.rpc.fastnear.com";
const HELPER = "https://helper.nearprotocol.com/account";
const CONTRACT = process.argv[2] ?? "amplop-c-mvznhnlx.testnet";
const provider = new JsonRpcProvider({ url: RPC });
const GAS = teraToGas("100");
const run = Date.now().toString(36).slice(-6);
const lines = [];
let failed = 0;
const say = (ok, name, detail = "") => {
  const line = `${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`;
  console.log(line);
  lines.push(line);
  if (!ok) failed++;
};
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
  return new Account(id, provider, kp.toString());
}
async function sub(parent, name, near) {
  const kp = KeyPair.fromRandom("ed25519");
  const id = `${name}.${parent.accountId}`;
  await parent.createAccount({ newAccountId: id, publicKey: kp.getPublicKey(), nearToTransfer: nearToYocto(near) });
  return new Account(id, provider, kp.toString());
}
const view = (method, args = {}) => provider.callFunction({ contractId: CONTRACT, method, args });
const call = (acc, methodName, args, deposit = 0n) =>
  acc.callFunction({ contractId: CONTRACT, methodName, args, gas: GAS, deposit, waitUntil: "FINAL" });

/** The attack must throw with `mustContain`, and `stateOf()` must read the same before and after. */
async function refused(name, attack, mustContain, stateOf) {
  const before = JSON.stringify(await stateOf());
  let msg = "";
  try {
    await attack();
    say(false, name, "serangan BERHASIL, seharusnya ditolak");
    return;
  } catch (e) {
    msg = String(e?.message ?? e);
  }
  const after = JSON.stringify(await stateOf());
  say(msg.includes(mustContain) && before === after, name, `ditolak: ${msg.slice(0, 90)}`);
}

// L1: nobody, us included, can change this contract
const keys = await provider.viewAccessKeyList({ accountId: CONTRACT });
say(keys.keys.length === 0, "L1 kontrak tanpa kunci akses: tidak ada admin, tidak bisa diganti", `${keys.keys.length} kunci`);

const root = await helperAccount("uji-serang");
const siti = await sub(root, "siti", "2.5");
const budi = await sub(root, "budi", "2.5");
const maling = await sub(root, "maling", "1.5");
const pembeli = await sub(root, "pembeli", "0.5");
const open = async (who, title) => (await call(who, "open_hajatan", { title, date: "uji", seed_bps: 500 }, nearToYocto("0.05"))).token_id;

const A = await open(siti, `Uji serangan ${run}`);
await call(budi, "give", { token_id: A, message: "selamat" }, nearToYocto("1"));
const state = () => view("hajatan", { token_id: A });

await refused("L2 orang asing menarik dana amplop orang lain", () => call(maling, "withdraw", { token_id: A }), "only the current holder", state);
await refused(
  "L3 memalsukan callback gagal bayar untuk menambah saldo",
  () => call(maling, "on_withdraw_done", { token_id: A, amount: nearToYocto("5").toString() }),
  "is private",
  state,
);
await refused(
  "L4 memalsukan resolver transfer untuk merebut amplop",
  () => call(maling, "nft_resolve_transfer", { previous_owner_id: maling.accountId, receiver_id: siti.accountId, token_id: A }),
  "is private",
  state,
);
await refused("L5 hadiah 1 yocto tanpa biaya simpan", () => call(maling, "give", { token_id: A, message: "x" }, 1n), "deposit must cover storage", state);

const M = await open(maling, `Hajatan maling ${run}`);
await refused(
  "L6 membelokkan benih Budi ke hajatan orang lain",
  () => call(siti, "reciprocate", { token_id: A, entry: 0, to_token_id: M, message: "x" }, nearToYocto("0.1")),
  "held by the original giver",
  state,
);

const B = await open(budi, `Hajatan Budi ${run}`);
const pend = await view("pending_replies", { token_id: A });
say(pend.length === 1 && pend[0].to_token_id === B, "L7 amplop berbunyi hanya untuk pemberi aslinya", `ke #${B}`);
await call(siti, "reciprocate", { token_id: A, entry: 0, to_token_id: B, message: "balas" }, nearToYocto("0.01"));
await refused("L8 membalas dua kali dari benih yang sama", () => call(siti, "reciprocate", { token_id: A, entry: 0, to_token_id: B, message: "lagi" }, nearToYocto("0.1")), "already replied", state);

// sale: money, seeds and rights move with the NFT
const C = await open(siti, `Dijual ${run}`);
await call(budi, "give", { token_id: C, message: "selamat" }, nearToYocto("0.2"));
const stateC = () => view("hajatan", { token_id: C });
await siti.callFunction({ contractId: CONTRACT, methodName: "nft_transfer", args: { receiver_id: pembeli.accountId, token_id: C }, gas: GAS, deposit: 1n, waitUntil: "FINAL" });
await refused("L9 pemilik lama menarik dana sesudah amplop dijual", () => call(siti, "withdraw", { token_id: C }), "only the current holder", stateC);
const beforeSale = await stateC();
await call(pembeli, "withdraw", { token_id: C });
const afterSale = await stateC();
say(afterSale.free === "0" && afterSale.seed_locked === beforeSale.seed_locked, "L10 pemegang baru menarik dana bebas, benih tamu tetap terkunci", `benih ${afterSale.seed_locked}`);
await refused("L11 menarik benih sesudah dana bebas habis", () => call(pembeli, "withdraw", { token_id: C }), "nothing to withdraw", stateC);

await call(maling, "set_open", { token_id: M, open: false });
await refused("L12 memberi ke hajatan yang sudah ditutup", () => call(budi, "give", { token_id: M, message: "x" }, nearToYocto("0.1")), "not accepting gifts", () => view("hajatan", { token_id: M }));

const report = `Serangan hidup, kontrak ${CONTRACT}\n${new Date().toISOString()}\n${lines.join("\n")}\n`;
fs.writeFileSync(new URL(`./serangan-laporan.txt`, import.meta.url), report);
process.exit(failed ? 1 : 0);
