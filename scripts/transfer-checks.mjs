// Transfer and payout paths that unit tests cannot show, run on a real chain.
// A unit test cannot prove that a refused nft_transfer_call leaves no lock (the chain rolls the receipt back),
// how much of its fixed 5 TGas the resolver burns on its heaviest path, or that a payout which really fails
// puts the money back into the amplop. These checks do, with throwaway accounts and random in-memory keys.
//   node transfer-checks.mjs [contract-id]                 NEAR testnet, the deployed contract
//   NEAR_RPC=http://127.0.0.1:3030 ATTACK_ROOT=root.json node transfer-checks.mjs rsvpay.test.near   local chain (CI)
// The public helper rate-limits by IP. If it refuses, set ATTACK_ROOT to a JSON file holding
// { accountId, secret } of a testnet account with about 2 NEAR, and the accounts start under it.
import fs from "node:fs";
import { Account, JsonRpcProvider, KeyPair, actions, nearToYocto, teraToGas } from "near-api-js";

const RPC = process.env.NEAR_RPC ?? "https://test.rpc.fastnear.com";
const HELPER = "https://helper.nearprotocol.com/account";
const CONTRACT = process.argv[2] ?? "rsvpay-v2.testnet";
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
const note = (text) => {
  console.log(text);
  lines.push(text);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rpc(method, params) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
    if (res.status === 429 || res.status >= 500) {
      await sleep(1500 * (i + 1));
      continue;
    }
    const body = await res.json();
    if (body.error) throw new Error(JSON.stringify(body.error).slice(0, 300));
    return body.result;
  }
  throw new Error(`${method}: RPC kept refusing`);
}
async function helperAccount(prefix) {
  const kp = KeyPair.fromRandom("ed25519");
  const id = `${prefix}-${run}.testnet`;
  const res = await fetch(HELPER, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ newAccountId: id, newAccountPublicKey: kp.getPublicKey().toString() }) });
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
  const id = `${name}-${run}.${parent.accountId}`;
  await parent.createAccount({ newAccountId: id, publicKey: kp.getPublicKey(), nearToTransfer: nearToYocto(near) });
  return new Account(id, provider, kp.toString());
}
/** An account whose name is its 64-character public key: the longest name the chain allows. */
async function longNamed(parent, near) {
  const kp = KeyPair.fromRandom("ed25519");
  const id = Buffer.from(kp.getPublicKey().data).toString("hex");
  await parent.transfer({ receiverId: id, amount: nearToYocto(near) });
  return new Account(id, provider, kp.toString());
}
const view = (method, args = {}) => provider.callFunction({ contractId: CONTRACT, method, args });
const call = (acc, methodName, args, deposit = 0n) =>
  acc.callFunction({ contractId: CONTRACT, methodName, args, gas: GAS, deposit, waitUntil: "FINAL" });
const open = async (who, title) => (await call(who, "open_hajatan", { title, date: "check", seed_bps: 500 }, nearToYocto("0.05"))).token_id;
const snapshot = async (token) => JSON.stringify([await view("hajatan", { token_id: token }), await view("is_locked", { token_id: token })]);

/** The call must throw with `mustContain`; owner, balance, seeds and lock must read the same before and after. */
async function refused(name, token, attack, mustContain) {
  const before = await snapshot(token);
  let msg = "";
  try {
    await attack();
    say(false, name, "WENT THROUGH, should have been refused");
    return;
  } catch (e) {
    msg = String(e?.message ?? e);
  }
  await sleep(1500);
  const after = await snapshot(token);
  say(msg.includes(mustContain) && before === after, name, `refused: ${msg.slice(0, 90)}`);
}

const rootFile = process.env.ATTACK_ROOT;
const rootKeys = rootFile ? JSON.parse(fs.readFileSync(rootFile, "utf8")) : null;
const root = rootKeys ? new Account(rootKeys.accountId, provider, rootKeys.secret) : await helperAccount("check-root");
const siti = await sub(root, "siti", "0.5");
const budi = await sub(root, "budi", "0.5");
const maling = await sub(root, "maling", "0.3");

const A = await open(siti, `Transfer checks ${run}`);
await call(budi, "give", { token_id: A, message: "a gift so there is money to take" }, nearToYocto("0.05"));

// P1 to P3: the token standard's own guards, on chain, with money inside the token
await refused(
  "P1 a stranger moves someone else's amplop with nft_transfer",
  A,
  () => maling.callFunction({ contractId: CONTRACT, methodName: "nft_transfer", args: { receiver_id: maling.accountId, token_id: A }, gas: GAS, deposit: 1n, waitUntil: "FINAL" }),
  "Approval extension is disabled",
);
await refused(
  "P2 a stranger's nft_transfer_call is refused and leaves no lock behind",
  A,
  () => maling.callFunction({ contractId: CONTRACT, methodName: "nft_transfer_call", args: { receiver_id: maling.accountId, token_id: A, msg: "" }, gas: GAS, deposit: 1n, waitUntil: "FINAL" }),
  "Approval extension is disabled",
);
await refused(
  "P3 a transfer without the one yoctoNEAR that proves a full-access key",
  A,
  () => siti.callFunction({ contractId: CONTRACT, methodName: "nft_transfer", args: { receiver_id: budi.accountId, token_id: A }, gas: GAS, deposit: 0n, waitUntil: "FINAL" }),
  "1 yoctoNEAR",
);

// P4: the resolver gets a fixed 5 TGas whatever the caller attaches, and a keyless contract cannot raise it.
// Its heaviest path is a refused transfer between two 64-character names where the sender holds only this amplop,
// so the sender's token list is deleted when the amplop leaves and built again when it comes back.
const long1 = await longNamed(root, "0.4");
const long2 = await longNamed(root, "0.05");
const W = await open(long1, `Resolver ${run}`);
await call(budi, "give", { token_id: W, message: "money inside" }, nearToYocto("0.05"));
const beforeW = await view("hajatan", { token_id: W });
const settle = await long1
  .callFunctionRaw({ contractId: CONTRACT, methodName: "nft_transfer_call", args: { receiver_id: long2.accountId, token_id: W, msg: "" }, gas: teraToGas("40"), deposit: 1n, waitUntil: "FINAL" })
  .catch((e) => e);
await sleep(2500);
const afterW = await view("hajatan", { token_id: W });
const lockedW = await view("is_locked", { token_id: W });
const burnt = (settle?.receipts_outcome ?? []).filter((r) => r.outcome.executor_id === CONTRACT).map((r) => Number(r.outcome.gas_burnt) / 1e12);
const resolver = burnt.at(-1) ?? NaN;
say(
  afterW.owner_id === long1.accountId && lockedW === false && afterW.balance === beforeW.balance && afterW.seed_locked === beforeW.seed_locked,
  "P4 a refused transfer between two 64-character names comes back whole and unlocks",
  `owner ${afterW.owner_id.slice(0, 8)}…, balance ${afterW.balance}`,
);
say(burnt.length >= 2 && resolver < 5, "P4 the resolver's heaviest path fits in its fixed 5 TGas", `contract receipts burnt ${burnt.map((g) => g.toFixed(2)).join(", ")} TGas; resolver ${resolver.toFixed(2)} of 5`);

// P5: a payout that really fails. The holder asks for a withdraw and deletes their own account before the coins
// arrive, so the transfer has nowhere to land. The callback must put the money back into the amplop.
// The deletion is signed ahead with a second key and sent the moment the withdraw is in a block.
let p5 = "the account was never gone in time";
for (let attempt = 1; attempt <= 4; attempt++) {
  const host = await sub(root, `host${attempt}`, "0.3");
  const T = await open(host, `Payout ${run} ${attempt}`);
  await call(budi, "give", { token_id: T, message: "to be withdrawn" }, nearToYocto("0.05"));
  const before = await view("hajatan", { token_id: T });
  const spare = KeyPair.fromRandom("ed25519");
  await host.addFullAccessKey(spare.getPublicKey());
  const hostSpare = new Account(host.accountId, provider, spare.toString());
  const goodbye = await hostSpare.createSignedTransaction({ receiverId: host.accountId, actions: [actions.deleteAccount(root.accountId)] });
  const sent = await host.signAndSendTransaction({
    receiverId: CONTRACT,
    actions: [actions.functionCall("withdraw", { token_id: T }, GAS, 0n)],
    waitUntil: "INCLUDED",
    throwOnFailure: false,
  });
  await provider.sendTransactionUntil(goodbye, "NONE").catch(() => null);
  const hash = sent.transaction?.hash ?? sent.transaction_outcome?.id;
  let logs = [];
  for (let i = 0; i < 20; i++) {
    await sleep(2000);
    try {
      const st = await rpc("EXPERIMENTAL_tx_status", { tx_hash: hash, sender_account_id: host.accountId, wait_until: "FINAL" });
      logs = st.receipts_outcome.flatMap((r) => r.outcome.logs);
      if (logs.some((l) => l.startsWith("amplop:paid") || l.startsWith("amplop:payout_failed_refunded"))) break;
    } catch {
      // not final yet
    }
  }
  const after = await view("hajatan", { token_id: T });
  if (logs.some((l) => l.startsWith("amplop:payout_failed_refunded"))) {
    say(
      after.balance === before.balance && after.free === before.free && after.seed_locked === before.seed_locked,
      "P5 a payout that fails on chain goes back into the amplop, to the yoctoNEAR",
      `withdraw ${hash}; free ${before.free} before, ${after.free} after the refund; attempt ${attempt}`,
    );
    p5 = "";
    break;
  }
  p5 = `attempt ${attempt}: the payout arrived before the account was gone (free ${after.free})`;
}
if (p5) note(`SKIP | P5 the holder's account outlived the payout every time | ${p5}`);

const chain = await rpc("status", []).then((s) => `${s.chain_id}, node ${s.version?.version}, protocol ${s.protocol_version}`, () => RPC);
const report = `Transfer and payout checks, contract ${CONTRACT} (${chain})\n${new Date().toISOString()}\n${lines.join("\n")}\n`;
fs.writeFileSync(new URL(`../docs/evidence/transfer-checks-report.txt`, import.meta.url), report);
process.exit(failed ? 1 : 0);
