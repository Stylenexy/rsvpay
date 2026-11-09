// How much the contract holds beyond what it owes: account balance minus storage minus every amplop's balance.
// Reads one block for every number, from archival testnet RPC. No keys, no dependencies.
//   node spare.mjs [block-height] [contract-id]
// Writes docs/evidence/spare-balance-report.txt when REPORT=1.
import { writeFileSync } from "node:fs";

const RPC = process.env.NEAR_RPC ?? "https://archival-rpc.testnet.fastnear.com";
const CONTRACT = process.argv[3] ?? "rsvpay-v2.testnet";
const YOCTO_PER_BYTE = 10n ** 19n; // storage_amount_per_byte on NEAR
const near = (y) => (Number(y / 10n ** 20n) / 10000).toFixed(4);

async function rpc(method, params) {
  for (let i = 0; ; i++) {
    const res = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
    const j = await res.json().catch(() => ({ error: res.status }));
    if (!j.error && !j.result?.error) return j.result;
    if (i === 8) throw new Error(JSON.stringify(j.error ?? j.result.error).slice(0, 300));
    await new Promise((r) => setTimeout(r, 5000 * (i + 1))); // public RPC rate limit
  }
}
const pause = () => new Promise((r) => setTimeout(r, 150));

const head = process.argv[2] ? Number(process.argv[2]) : (await rpc("block", { finality: "final" })).header.height;
const at = { block_id: head };
const view = async (method, args) => {
  const r = await rpc("query", { request_type: "call_function", ...at, account_id: CONTRACT, method_name: method, args_base64: Buffer.from(JSON.stringify(args)).toString("base64") });
  return JSON.parse(Buffer.from(r.result).toString());
};

const account = await rpc("query", { request_type: "view_account", ...at, account_id: CONTRACT });
const supply = Number(await view("nft_total_supply", {}));
const ids = [];
for (let from = 0; ids.length < supply; from += 50) {
  const page = await view("nft_tokens", { from_index: String(from), limit: 50 });
  if (!page.length) break;
  ids.push(...page.map((t) => t.token_id));
}
let owed = 0n;
for (const id of ids) {
  owed += BigInt((await view("hajatan", { token_id: id })).balance);
  await pause();
}

const balance = BigInt(account.amount);
const storage = BigInt(account.storage_usage) * YOCTO_PER_BYTE;
const spare = balance - storage - owed;
const lines = [
  `${CONTRACT} at block ${head}`,
  `account balance        ${near(balance)} NEAR`,
  `storage ${account.storage_usage} bytes  ${near(storage)} NEAR`,
  `owed to ${ids.length} amplop       ${near(owed)} NEAR (sum of hajatan(id).balance)`,
  `spare                  ${near(spare)} NEAR`,
  spare >= 0n ? "PASS | the contract holds every amplop's balance plus its storage" : "FAIL | balance is below storage plus what the amplop hold",
];
console.log(lines.join("\n"));
if (process.env.REPORT) {
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "short" }).format(new Date());
  writeFileSync(new URL("../docs/evidence/spare-balance-report.txt", import.meta.url), `Read ${day} Asia/Jakarta from ${RPC}\n${lines.join("\n")}\n`);
}
