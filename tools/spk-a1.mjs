// SPK-A1: the full Amplop Balas cycle on NEAR TESTNET.
// Siti opens a hajatan, Budi gives, Budi later opens his own, Siti's amplop "rings",
// Siti replies with seed + top-up, the NFT is sold and the old owner is locked out,
// then every key of the contract account is deleted (no admin) and it still works.
// Throwaway test accounts with random in-memory keys: nothing is saved to disk.
// Run: node spk-a1.mjs <path-to-amplop_balas.wasm>
import fs from "node:fs";
import { Account, JsonRpcProvider, KeyPair, nearToYocto, yoctoToNear, teraToGas } from "near-api-js";

// rpc.testnet.near.org is deprecated and rate-limits (429) since 2026; FastNEAR is a listed provider
const RPC = process.env.NEAR_RPC ?? "https://test.rpc.fastnear.com";
const HELPER = "https://helper.nearprotocol.com/account";
const provider = new JsonRpcProvider({ url: RPC });
const wasmPath = process.argv[2];
if (!wasmPath) throw new Error("usage: node spk-a1.mjs <wasm>");
const GAS = teraToGas("100");
const run = Date.now().toString(36);
const log = [];
const say = (ok, name, detail = "") => {
  const line = `${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`;
  console.log(line);
  log.push(line);
  return ok;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const near = (y) => yoctoToNear(BigInt(y).toString(), 4);

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

async function subAccount(parent, name, nearAmount) {
  const kp = KeyPair.fromRandom("ed25519");
  const id = `${name}.${parent.accountId}`;
  await parent.createAccount({ newAccountId: id, publicKey: kp.getPublicKey(), nearToTransfer: nearToYocto(nearAmount) });
  return new Account(id, provider, kp.toString());
}

const view = (method, args = {}) => provider.callFunction({ contractId: C.accountId, method, args });
const call = (acc, methodName, args, deposit = 0n) =>
  acc.callFunction({ contractId: C.accountId, methodName, args, gas: GAS, deposit, waitUntil: "FINAL" });

// A rejection counts only if the call failed AND the state we care about did not change.
async function expectRejected(name, fn, mustContain, stateOf) {
  const before = JSON.stringify(await stateOf());
  let reason = "";
  let threw = false;
  try {
    const res = await fn();
    reason = JSON.stringify(res ?? "");
  } catch (e) {
    threw = true;
    reason = String(e?.message ?? e) + " " + JSON.stringify(e, Object.getOwnPropertyNames(e)).slice(0, 3000);
  }
  await sleep(1500);
  const after = JSON.stringify(await stateOf());
  const unchanged = before === after;
  const msgOk = reason.includes(mustContain);
  const trap = reason.includes("unreachable");
  const detail = `${unchanged ? "state unchanged" : "STATE CHANGED"}; reason: ${msgOk ? mustContain : trap ? "wasm trap (message lost)" : reason.slice(0, 160)}`;
  return say(threw && unchanged && msgOk, name, detail);
}

console.log("== SPK-A1 Amplop Balas full cycle (testnet) ==");
const C = await helperAccount("amplop-c");
const root = await helperAccount("amplop-ppl");
const siti = await subAccount(root, "siti", "2.5");
const budi = await subAccount(root, "budi", "2.5");
const buyer = await subAccount(root, "buyer", "1.5");
const stranger = root;
say(true, "test accounts", `contract=${C.accountId} siti=${siti.accountId} budi=${budi.accountId} buyer=${buyer.accountId}`);

await C.deployContract(fs.readFileSync(wasmPath));
await call(C, "new", {});
say(true, "contract deployed and initialised", C.accountId);

// A00 panics must carry their message (build with --cfg near), or the web cannot explain a refusal
let a00 = "";
try {
  await view("give", { token_id: "99", message: "x" });
} catch (e) {
  a00 = String(e?.message ?? e);
}
say(a00.includes("no such amplop"), "A00 contract errors reach the caller with their message", a00.slice(0, 160));

// A01 open
await call(siti, "open_hajatan", { title: "Nikahan Siti & Andi", date: "2026-11-21", seed_bps: 500 }, nearToYocto("0.05"));
let A = await view("hajatan", { token_id: "1" });
say(A.owner_id === siti.accountId && A.seed_bps === 500 && A.open === true, "A01 Siti opens a hajatan: amplop NFT #1 minted to her, seed 5%", `free=${near(A.free)} NEAR from leftover deposit`);

// A02 give
const gift = nearToYocto("1");
await call(budi, "give", { token_id: "1", message: "Selamat ya Siti!" }, gift);
let entries = await view("entries", { token_id: "1" });
const e0 = entries[0];
const amount = BigInt(e0.amount);
const seed = BigInt(e0.seed);
say(e0.giver === budi.accountId && amount > 0n && amount < gift && seed === (amount * 500n) / 10000n, "A02 Budi gives 1 NEAR: entry recorded, 5% seed locked in Budi's name", `amount=${near(amount)} seed=${near(seed)}`);
A = await view("hajatan", { token_id: "1" });
say(BigInt(A.balance) === BigInt(A.free) + BigInt(A.seed_locked) && BigInt(A.seed_locked) === seed, "A03 invariant balance = free + seed_locked", `balance=${near(A.balance)} seed_locked=${near(A.seed_locked)}`);

let pending = await view("pending_replies", { token_id: "1" });
say(pending.length === 0, "A04 no reply pending while Budi has no hajatan");

// A05 "Nov 2028": Budi hosts
await call(budi, "open_hajatan", { title: "Syukuran Budi", date: "2028-11-20", seed_bps: 500 }, nearToYocto("0.05"));
pending = await view("pending_replies", { token_id: "1" });
say(pending.length === 1 && pending[0].entry === 0 && pending[0].to_token_id === "2" && pending[0].seed === e0.seed, "A05 Budi opens his own hajatan (#2): Siti's amplop rings for entry 0", JSON.stringify(pending[0]));

const stateA = async () => [await view("hajatan", { token_id: "1" }), await view("hajatan", { token_id: "2" }), await view("entries", { token_id: "1" })];
await expectRejected("A06 a stranger cannot release Budi's seed", () => call(buyer, "reciprocate", { token_id: "1", entry: 0, to_token_id: "2", message: "" }), "only the current holder", stateA);
await expectRejected("A07 Budi cannot pull his own seed back", () => call(budi, "reciprocate", { token_id: "1", entry: 0, to_token_id: "2", message: "" }), "only the current holder", stateA);

// A08 Siti replies with seed + 0.5 NEAR
const topUp = nearToYocto("0.5");
const B0 = await view("hajatan", { token_id: "2" });
await call(siti, "reciprocate", { token_id: "1", entry: 0, to_token_id: "2", message: "Gantian ya Bud, selamat!" }, topUp);
const bEntries = await view("entries", { token_id: "2" });
const r = bEntries[bEntries.length - 1];
const B1 = await view("hajatan", { token_id: "2" });
A = await view("hajatan", { token_id: "1" });
entries = await view("entries", { token_id: "1" });
const replyCost = seed + topUp - BigInt(r.amount);
say(
  r.giver === siti.accountId && r.reply_to?.token_id === "1" && r.reply_to?.entry === 0 && entries[0].replied?.token_id === "2" && BigInt(A.seed_locked) === 0n && BigInt(B1.balance) - BigInt(B0.balance) === BigInt(r.amount),
  "A08 one tap: seed + 0.5 NEAR land in Budi's amplop as a reply linked both ways",
  `reply=${near(r.amount)} NEAR (seed ${near(seed)} + top-up 0.5 - storage ${near(replyCost)})`
);
await expectRejected("A09 the same gift cannot be replied twice", () => call(siti, "reciprocate", { token_id: "1", entry: 0, to_token_id: "2", message: "" }, topUp), "already replied", stateA);

// A10 withdraw free money only
const sitiBefore = BigInt((await provider.viewAccount({ accountId: siti.accountId })).amount);
const free = BigInt(A.free);
await call(siti, "withdraw", { token_id: "1" });
await sleep(3000);
const sitiAfter = BigInt((await provider.viewAccount({ accountId: siti.accountId })).amount);
A = await view("hajatan", { token_id: "1" });
say(BigInt(A.free) === 0n && sitiAfter - sitiBefore > free - nearToYocto("0.01"), "A10 Siti withdraws: free money paid out, nothing else", `received=${near(sitiAfter - sitiBefore)} of free ${near(free)}`);

// A11 sale: Siti sells the amplop to buyer; old owner locked out, money travels
await call(stranger, "give", { token_id: "1", message: "titip buat kalian" }, nearToYocto("0.3"));
const beforeSale = await view("hajatan", { token_id: "1" });
await call(siti, "nft_transfer", { receiver_id: buyer.accountId, token_id: "1" }, 1n);
const afterSale = await view("hajatan", { token_id: "1" });
say(afterSale.owner_id === buyer.accountId && afterSale.balance === beforeSale.balance, "A11 amplop #1 transferred to buyer: money and history travel with it", `owner=${afterSale.owner_id} balance=${near(afterSale.balance)}`);
await expectRejected("A12 old owner (Siti) cannot withdraw after the sale", () => call(siti, "withdraw", { token_id: "1" }), "only the current holder", async () => view("hajatan", { token_id: "1" }));
await call(buyer, "withdraw", { token_id: "1" });
await sleep(3000);
say(BigInt((await view("hajatan", { token_id: "1" })).free) === 0n, "A13 new holder (buyer) withdraws the free money");

// A14 private callback
await expectRejected("A14 payout callback cannot be called from outside", () => call(stranger, "on_withdraw_done", { token_id: "1", amount: "1" }), "is private", async () => view("hajatan", { token_id: "1" }));

// A15 no admin
const keys = await C.getAccessKeyList();
for (const k of keys.keys) await C.deleteKey(k.public_key);
await sleep(2500);
const left = await provider.viewAccessKeyList({ accountId: C.accountId });
say(left.keys.length === 0, "A15 contract account locked: zero access keys (no admin, no upgrade)", `keys left=${left.keys.length}`);
await call(stranger, "give", { token_id: "2", message: "setelah dikunci" }, nearToYocto("0.2"));
say((await view("hajatan", { token_id: "2" })).entries === 2, "A16 the keyless contract still works (gift into Budi's amplop)");

const fails = log.filter((l) => l.startsWith("FAIL")).length;
const report = `testnet ${new Date().toISOString()} contract=${C.accountId}\n` + log.join("\n") + `\n\nSUMMARY: ${log.length - fails} PASS, ${fails} FAIL\n`;
fs.writeFileSync(new URL(`./spk-a1-report-${run}.txt`, import.meta.url), report);
console.log(`\nSUMMARY: ${log.length - fails} PASS, ${fails} FAIL`);
process.exit(fails ? 1 : 0);
