// Issue #16: how heavy is the view pending_replies on a big book?
// pending_replies looks up, for every gift not yet replied to, the giver's newest open amplop,
// reading up to 100 of the giver's tokens each time. Worst case: one giver who holds many amplop
// and gave many times into the same book. Runs on NEAR TESTNET with throwaway accounts.
//   node scale.mjs
// The public helper rate-limits by IP. If it refuses, set ATTACK_ROOT to a JSON file holding
// { accountId, secret } of a testnet account with about 3 NEAR, and the accounts start under it.
import fs from "node:fs";
import { Account, JsonRpcProvider, KeyPair, actions as actionCreators, nearToYocto, teraToGas } from "near-api-js";

const RPC = process.env.NEAR_RPC ?? "https://test.rpc.fastnear.com";
const HELPER = "https://helper.nearprotocol.com/account";
const CONTRACT = process.env.CONTRACT ?? "rsvpay-v2.testnet";
const GIFTS = Number(process.env.GIFTS ?? 300);
const HOLDINGS = [1, 10, 50, 100];
const LIMITS = [25, 50, 100, 200, 300];
const provider = new JsonRpcProvider({ url: RPC });
const run = Date.now().toString(36).slice(-6);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lines = [];
const note = (t) => {
  console.log(t);
  lines.push(t);
};

async function rpcRaw(method, params) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (res.status === 429 || res.status >= 500) {
      await sleep(1500 * (i + 1));
      continue;
    }
    return res.json();
  }
  throw new Error(`${method}: RPC kept refusing`);
}
const view = async (method, args) => {
  const t0 = performance.now();
  const body = await rpcRaw("query", {
    request_type: "call_function",
    finality: "final",
    account_id: CONTRACT,
    method_name: method,
    args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
  });
  const ms = Math.round(performance.now() - t0);
  const err = body.error ?? (body.result?.error ? { message: body.result.error } : null);
  if (err) return { ok: false, ms, error: JSON.stringify(err.data ?? err.message ?? err).slice(0, 160) };
  return { ok: true, ms, value: JSON.parse(Buffer.from(body.result.result).toString()) };
};

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
  const id = `${name}-${run}.${parent.accountId}`;
  await parent.createAccount({ newAccountId: id, publicKey: kp.getPublicKey(), nearToTransfer: nearToYocto(near) });
  return new Account(id, provider, kp.toString());
}
const batch = (acc, calls) =>
  acc.signAndSendTransaction({
    receiverId: CONTRACT,
    actions: calls.map(([m, args, tgas, dep]) => actionCreators.functionCall(m, args, teraToGas(String(tgas)), dep)),
    waitUntil: "FINAL",
  });

const rootFile = process.env.ATTACK_ROOT;
const rootKeys = rootFile ? JSON.parse(fs.readFileSync(rootFile, "utf8")) : null;
const root = rootKeys ? new Account(rootKeys.accountId, provider, rootKeys.secret) : await helperAccount("scale-root");
const host = await sub(root, "host", "0.3");
const giver = await sub(root, "giver", "4.5");
note(`Scale check on ${CONTRACT}, ${new Date().toISOString()}. Host ${host.accountId}, giver ${giver.accountId}.`);

await batch(host, [["open_hajatan", { title: "Scale book", date: "2026-12-12", seed_bps: 500 }, 30, nearToYocto("0.05")]]);
const book = (await view("hajatan_of", { account_id: host.accountId })).value.at(-1).token_id;
let held = 0;
async function openUpTo(n) {
  while (held < n) {
    const k = Math.min(20, n - held);
    await batch(giver, Array.from({ length: k }, (_, i) => ["open_hajatan", { title: `Giver ${held + i + 1}`, date: "2027-01-01", seed_bps: 0 }, 12, nearToYocto("0.01")]));
    held += k;
  }
}
await openUpTo(1);
for (let given = 0; given < GIFTS; ) {
  const k = Math.min(25, GIFTS - given);
  await batch(giver, Array.from({ length: k }, () => ["give", { token_id: book, message: "" }, 8, nearToYocto("0.003")]));
  given += k;
}
const h = (await view("hajatan", { token_id: book })).value;
note(`Book #${book} holds ${h.entries} gifts, all from the same giver, none replied to.`);
note("");
note("giver holds | limit | view over RPC | answer | gas burnt as a transaction");

for (const holding of HOLDINGS) {
  await openUpTo(holding);
  const owned = (await view("nft_supply_for_owner", { account_id: giver.accountId })).value;
  for (const limit of LIMITS) {
    const v = await view("pending_replies", { token_id: book, from: 0, limit });
    let gas = "?";
    try {
      const out = await giver.signAndSendTransaction({
        receiverId: CONTRACT,
        actions: [actionCreators.functionCall("pending_replies", { token_id: book, from: 0, limit }, teraToGas("300"), 0n)],
        waitUntil: "FINAL",
        throwOnFailure: false,
      });
      const failure = out.receipts_outcome.map((r) => r.outcome.status?.Failure).find(Boolean);
      const burnt = out.receipts_outcome.reduce((s, r) => s + r.outcome.gas_burnt, 0);
      gas = failure ? `fails: ${JSON.stringify(failure).slice(0, 90)}` : `${(burnt / 1e12).toFixed(1)} TGas`;
    } catch (e) {
      gas = `fails: ${String(e?.message ?? e).slice(0, 90)}`;
    }
    note(`${String(owned).padStart(11)} | ${String(limit).padStart(5)} | ${v.ok ? `ok, ${v.value.length} rows` : `error ${v.error}`} | ${v.ms} ms | ${gas}`);
  }
}
const out = new URL("../docs/evidence/scale-report.txt", import.meta.url);
fs.writeFileSync(out, [...lines, ""].join("\n"));
console.log(`written ${out.pathname}`);
