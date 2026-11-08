// Issue #12, on chain: a receiver holds nft_on_transfer open for hundreds of blocks.
// While it holds, the amplop must stay locked and refuse withdraw, reciprocate and set_open,
// then settle normally once the receiver answers. Runs on NEAR TESTNET with throwaway accounts.
//   node long-settle.mjs            N = 250 (answer true) and N = 400 (answer false)
//   node long-settle.mjs max        N = 10,000,000: holds until the receiver's gas runs out
// The receiver is long-receiver/ (build: cd long-receiver && cargo build --target wasm32-unknown-unknown --release).
// The public helper rate-limits by IP. If it refuses, set ATTACK_ROOT to a JSON file holding
// { accountId, secret } of a testnet account with about 4 NEAR, and the accounts start under it.
import fs from "node:fs";
import { Account, JsonRpcProvider, KeyPair, actions as actionCreators, nearToYocto, teraToGas } from "near-api-js";

const RPC = process.env.NEAR_RPC ?? "https://test.rpc.fastnear.com";
const HELPER = "https://helper.nearprotocol.com/account";
const CONTRACT = process.env.CONTRACT ?? "rsvpay-v2.testnet";
const MAX = process.argv[2] === "max";
const TX_GAS = teraToGas(process.env.TX_TGAS ?? "300");
const provider = new JsonRpcProvider({ url: RPC });
const run = Date.now().toString(36).slice(-6);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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

async function rpc(method, params) {
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
    const body = await res.json();
    if (body.error) throw new Error(JSON.stringify(body.error).slice(0, 300));
    return body.result;
  }
  throw new Error(`${method}: RPC kept refusing`);
}
const height = async () => (await rpc("block", { finality: "optimistic" })).header.height;
const view = async (method, args) => {
  const r = await rpc("query", {
    request_type: "call_function",
    finality: "optimistic",
    account_id: CONTRACT,
    method_name: method,
    args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
  });
  return JSON.parse(Buffer.from(r.result).toString());
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
const call = (acc, methodName, args, deposit = 0n) =>
  acc.callFunction({ contractId: CONTRACT, methodName, args, gas: teraToGas("100"), deposit, waitUntil: "FINAL" });
async function refusedWith(acc, methodName, args, mustContain) {
  try {
    await call(acc, methodName, args);
    return `went through`;
  } catch (e) {
    const msg = String(e?.message ?? e);
    return msg.includes(mustContain) ? true : msg.slice(0, 120);
  }
}

const rootFile = process.env.ATTACK_ROOT;
const rootKeys = rootFile ? JSON.parse(fs.readFileSync(rootFile, "utf8")) : null;
const root = rootKeys ? new Account(rootKeys.accountId, provider, rootKeys.secret) : await helperAccount("long-root");
const siti = await sub(root, "siti", "0.8");
const recv = await sub(root, "recv", "1.6");
const code = fs.readFileSync(new URL("./long-receiver/target/wasm32-unknown-unknown/release/long_receiver.wasm", import.meta.url));
await recv.signAndSendTransaction({ receiverId: recv.accountId, actions: [actionCreators.deployContract(code)], waitUntil: "FINAL" });
note(`Receiver ${recv.accountId} runs long-receiver (${code.length} bytes). Sender ${siti.accountId}. Contract ${CONTRACT}. Prepaid gas per transfer ${Number(TX_GAS) / 1e12} TGas.`);

/** One transfer held for `blocks` blocks. Returns what the report needs. */
async function scenario(blocks, mode) {
  const label = `N=${blocks} ${mode}`;
  const opened = await call(siti, "open_hajatan", { title: `Long settle ${blocks}`, date: "2026-12-12", seed_bps: 500 }, nearToYocto("0.05"));
  const token = opened?.token_id ?? (await view("hajatan_of", { account_id: siti.accountId })).at(-1).token_id;
  await call(siti, "give", { token_id: token, message: "a gift so there is money to steal" }, nearToYocto("0.02"));
  const before = await view("hajatan", { token_id: token });

  const sent = await siti.signAndSendTransaction({
    receiverId: CONTRACT,
    actions: [actionCreators.functionCall("nft_transfer_call", { receiver_id: recv.accountId, token_id: token, msg: `${blocks}:${mode}` }, TX_GAS, 1n)],
    waitUntil: "INCLUDED",
    throwOnFailure: false,
  });
  const hash = sent.transaction?.hash ?? sent.transaction_outcome?.id;
  const start = await height();
  note(`${label}: amplop #${token}, transfer ${hash}, sent near block ${start}`);

  for (let i = 0; i < 30 && !(await view("is_locked", { token_id: token })); i++) await sleep(1000);
  say(await view("is_locked", { token_id: token }), `${label}: is_locked is true while the receiver holds`);
  const owner = (await view("nft_token", { token_id: token }))?.owner_id;
  say(owner === recv.accountId, `${label}: the receiver owns the amplop on paper during the hold`, owner);
  for (const [m, args] of [
    ["withdraw", { token_id: token }],
    ["reciprocate", { token_id: token, entry: 0, to_token_id: "1", message: "x" }],
    ["set_open", { token_id: token, open: false }],
  ]) {
    const r = await refusedWith(recv, m, args, "amplop is mid-transfer");
    say(r === true, `${label}: receiver's ${m} during the hold is refused "amplop is mid-transfer"`, r === true ? "" : r);
  }
  const old = await refusedWith(siti, "withdraw", { token_id: token }, "only the current holder");
  say(old === true, `${label}: sender's withdraw during the hold is refused, it is not the holder now`, old === true ? "" : old);

  // keep sampling the lock until it lets go
  const samples = [];
  let unlockedAt = null;
  let lastLocked = start;
  while (true) {
    const h = await height();
    const locked = await view("is_locked", { token_id: token });
    if (!locked) {
      unlockedAt = h;
      break;
    }
    lastLocked = h;
    if (!samples.length || h - samples.at(-1) >= (MAX ? 1000 : 50)) {
      samples.push(h);
      console.log(`  ${label}: block ${h} (+${h - start}) still locked`);
    }
    if (h - start > 30_000_000) break;
    await sleep(MAX ? 20_000 : 4_000);
  }
  say(lastLocked - start >= Math.min(blocks, 300) || MAX, `${label}: still locked ${lastLocked - start} blocks after sending`, `last locked sample at block ${lastLocked}`);
  say(unlockedAt !== null, `${label}: the resolver ran and is_locked is false again`, `at block ${unlockedAt} (+${unlockedAt - start})`);

  // read what the receiver logged
  let links = "?", answer = "?", firstGas = "?", lastGas = "?";
  for (let i = 0; i < 20; i++) {
    try {
      const st = await rpc("EXPERIMENTAL_tx_status", { tx_hash: hash, sender_account_id: siti.accountId, wait_until: "NONE" });
      const logs = st.receipts_outcome.flatMap((r) => r.outcome.logs);
      const gl = logs.map((l) => /gas_left=(\d+)/.exec(l)?.[1]).filter(Boolean).map(Number);
      const ans = logs.find((l) => l.startsWith("hold:answer"));
      const lk = logs.filter((l) => l.startsWith("hold:link")).length;
      links = ans ? /links=(\d+)/.exec(ans)[1] : `${lk + 1} (gas ran out before an answer)`;
      answer = ans ? ans.split(" ")[1] : "none, the receiver failed";
      firstGas = gl.length ? (gl[0] / 1e12).toFixed(1) : "?";
      lastGas = gl.length ? (gl.at(-1) / 1e12).toFixed(1) : "?";
      const burnt = st.receipts_outcome.reduce((s, r) => s + r.outcome.gas_burnt, st.transaction_outcome.outcome.gas_burnt);
      note(`${label}: receiver answered ${answer} after ${links} yield link(s); gas left ${firstGas} TGas at the start, ${lastGas} TGas at the last link; total gas burnt ${(burnt / 1e12).toFixed(1)} TGas`);
      break;
    } catch (e) {
      await sleep(5000);
    }
  }
  const after = await view("nft_token", { token_id: token });
  const expect = mode === "keep" && answer === "false" ? recv.accountId : siti.accountId;
  say(after?.owner_id === expect, `${label}: the amplop ends with ${mode === "keep" && answer === "false" ? "the receiver, which kept it" : "the sender, as NEP-171 says when the receiver answers true or fails"}`, after?.owner_id);
  const end = await view("hajatan", { token_id: token });
  say(end.balance === before.balance && end.seed_locked === before.seed_locked, `${label}: no coin moved while it was held`, `balance ${end.balance}, kept ${end.seed_locked}`);
  if (expect === recv.accountId) {
    const r = await refusedWith(recv, "withdraw", { token_id: token }, "never");
    say(r === "went through", `${label}: after it settles the new holder can withdraw, so the lock let go`, r === "went through" ? "" : r);
  }
  return { token, hash, start, unlockedAt, links };
}

const header = [`Long settle on ${CONTRACT}, ${new Date().toISOString()}`];
if (MAX) {
  const r = await scenario(10_000_000, "back");
  note(`Largest hold in one transaction: ${r.unlockedAt - r.start} blocks (${r.links} yield links), with ${Number(TX_GAS) / 1e12} TGas prepaid. LOCK_MAX_BLOCKS is 1,000,000.`);
} else {
  await scenario(250, "back");
  await scenario(400, "keep");
}
const out = new URL(`../docs/evidence/${MAX ? "long-settle-max-report.txt" : "long-settle-report.txt"}`, import.meta.url);
fs.writeFileSync(out, [...header, ...lines, "", failed ? `FAIL | ${failed} checks` : "PASS | every check", ""].join("\n"));
console.log(failed ? `FAIL | ${failed} checks` : "PASS | every check");
process.exit(failed ? 1 : 0);
