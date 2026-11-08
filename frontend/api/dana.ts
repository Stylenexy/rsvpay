import { createHash } from 'node:crypto';
import { Account, JsonRpcProvider, actions, nearToYocto } from 'near-api-js';

/**
 * A small purse of test NEAR, so a visitor never depends on the public helper's limits.
 * Testnet only: the key behind it guards play money, and it can only make sub-accounts of itself and top them up.
 *
 * Limits need a memory, and this function has none, so the chain is the memory: a small marker sub-account
 * can be created only once. Markers hold a salted hash, never an address. Every spend passes three gates:
 * this address this hour, this account once, and everyone today.
 */

const RPC = 'https://test.rpc.fastnear.com';
// The largest gift button is Rp1.000.000 = 2 NEAR at the demo rate; with its storage and gas a new guest needs about 2.01.
const NEW_ACCOUNT = nearToYocto('2.1');
const TOP_UP = nearToYocto('0.5');
const LOW = BigInt(nearToYocto('0.5'));
const MARKER = nearToYocto('0.002');
const PER_ADDRESS_HOUR = 6;
const PER_DAY = 60;
// Keep enough for the purse to pay for its own transactions; past this the page falls back to the public helper.
const FLOOR = BigInt(nearToYocto('3'));

const answer = (status: number, body: unknown) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
const name = (text: unknown) => (typeof text === 'string' ? text.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 14) : '') || 'tamu';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Accounts the purse made for a visitor, and their children: `name-xxxxx(xx).` repeated, ending in the purse. Markers never match. */
export function isVisitorAccount(accountId: string, purse: string) {
  const escaped = purse.replace(/[.]/g, '\\.');
  return new RegExp(`^([a-z0-9]{1,14}-[a-z0-9]{5,7}\\.)+${escaped}$`).test(accountId);
}

/** Slots fill from the bottom, so the first free one is found by halving rather than by asking for every slot. */
export async function firstFree(taken: (i: number) => Promise<boolean>, max: number) {
  let lo = 0;
  let hi = max;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (await taken(mid)) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Takes the first free slot; when another request wins the same slot in the same second, it tries the next one. */
export async function takeSlot(taken: (i: number) => Promise<boolean>, claim: (i: number) => Promise<boolean>, max: number) {
  for (let i = await firstFree(taken, max); i < max; i++) {
    if (await claim(i)) return true;
  }
  return false;
}

export async function GET() {
  const purse = process.env.DANA_AKUN;
  if (!purse) return answer(503, { ok: false });
  const { amount } = await new JsonRpcProvider({ url: RPC }).viewAccount({ accountId: purse });
  return answer(200, { ok: BigInt(amount) >= FLOOR * 3n });
}

export async function POST(request: Request) {
  const purse = process.env.DANA_AKUN;
  const key = process.env.DANA_KUNCI;
  if (!purse || !key) return answer(503, { error: 'purse is not set up' });
  const body = (await request.json().catch(() => null)) as { ask?: string; name?: string; publicKey?: string; accountId?: string } | null;
  const provider = new JsonRpcProvider({ url: RPC });
  const exists = (accountId: string) => provider.viewAccount({ accountId }).then(() => true, () => false);
  const marker = (text: string) => `m${createHash('sha256').update(`${key}:${text}`).digest('hex').slice(0, 20)}.${purse}`;
  const address = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const hour = Math.floor(Date.now() / 3_600_000);
  const day = Math.floor(Date.now() / 86_400_000);
  try {
    const left = BigInt((await provider.viewAccount({ accountId: purse })).amount);
    if (left < FLOOR) return answer(503, { error: 'purse is low' });
    const account = new Account(purse, provider, key as `ed25519:${string}`);

    // Two visitors in the same second can collide on the purse's nonce, so a failure is checked before it is retried.
    const once = async (send: () => Promise<unknown>, done: () => Promise<boolean>) => {
      try {
        await send();
      } catch {
        await sleep(900);
        if (!(await done())) await send();
      }
    };
    const claim = async (id: string) => {
      try {
        await account.signAndSendTransaction({ receiverId: id, actions: [actions.createAccount(), actions.transfer(BigInt(MARKER))], waitUntil: 'FINAL' });
        return true;
      } catch {
        return false;
      }
    };
    const gate = (label: string, max: number) => takeSlot((i) => exists(marker(`${label}|${i}`)), (i) => claim(marker(`${label}|${i}`)), max);

    if (body?.ask === 'akun') {
      if (!/^ed25519:[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(body.publicKey ?? '')) return answer(400, { error: 'bad key' });
      if (!(await gate(`akun|${address}|${hour}`, PER_ADDRESS_HOUR))) return answer(429, { error: 'too many accounts from here this hour' });
      if (!(await gate(`akun|day|${day}`, PER_DAY))) return answer(429, { error: 'the purse has made enough accounts today' });
      const accountId = `${name(body.name)}-${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 4)}.${purse}`;
      await once(() => account.createAccount({ newAccountId: accountId, publicKey: body.publicKey!, nearToTransfer: NEW_ACCOUNT }), () => exists(accountId));
      return answer(200, { accountId });
    }

    if (body?.ask === 'isi') {
      const accountId = body.accountId ?? '';
      if (!isVisitorAccount(accountId, purse)) return answer(400, { error: 'not one of ours' });
      // a visitor's account always holds the key their browser made; markers and emptied accounts hold none
      const keys = await provider.viewAccessKeyList({ accountId }).then((r) => r.keys.length, () => 0);
      if (keys === 0) return answer(400, { error: 'not one of ours' });
      const balance = BigInt((await provider.viewAccount({ accountId })).amount);
      if (balance >= LOW) return answer(200, { filled: false });
      if (!(await gate(`isi|${address}|${hour}`, PER_ADDRESS_HOUR))) return answer(429, { error: 'too many top-ups from here this hour' });
      if (!(await claim(marker(`isi|${accountId}`)))) return answer(429, { error: 'already topped up once' });
      if (!(await gate(`isi|day|${day}`, PER_DAY))) return answer(429, { error: 'the purse has topped up enough today' });
      await once(() => account.transfer({ receiverId: accountId, amount: TOP_UP }), async () => BigInt((await provider.viewAccount({ accountId })).amount) > balance);
      return answer(200, { filled: true });
    }
    return answer(400, { error: 'unknown request' });
  } catch {
    return answer(502, { error: 'network refused' });
  }
}
