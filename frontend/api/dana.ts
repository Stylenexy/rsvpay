import { createHash } from 'node:crypto';
import { Account, JsonRpcProvider, actions, nearToYocto } from 'near-api-js';

/**
 * A small purse of test NEAR, so a visitor never depends on the public helper's limits.
 * Testnet only: the key behind it guards play money, and it can only make sub-accounts of itself and top them up.
 *
 * Limits need a memory, and this function has none, so the chain is the memory: a small marker sub-account
 * can be created only once. Markers hold a salted hash, never an address.
 */

const RPC = 'https://test.rpc.fastnear.com';
const NEW_ACCOUNT = nearToYocto('1');
const TOP_UP = nearToYocto('0.5');
const LOW = BigInt(nearToYocto('0.5'));
const MARKER = nearToYocto('0.002');
const ACCOUNTS_PER_HOUR = 6;
// Keep enough for the purse to pay for its own transactions; past this the page falls back to the public helper.
const FLOOR = BigInt(nearToYocto('3'));

const answer = (status: number, body: unknown) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
const name = (text: unknown) => (typeof text === 'string' ? text.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 14) : '') || 'tamu';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET() {
  const purse = process.env.DANA_AKUN;
  if (!purse) return answer(503, { error: 'purse is not set up' });
  const { amount } = await new JsonRpcProvider({ url: RPC }).viewAccount({ accountId: purse });
  return answer(200, { left: Number(BigInt(amount) / 10n ** 21n) / 1000 });
}

export async function POST(request: Request) {
  const purse = process.env.DANA_AKUN;
  const key = process.env.DANA_KUNCI;
  if (!purse || !key) return answer(503, { error: 'purse is not set up' });
  const body = (await request.json().catch(() => null)) as { ask?: string; name?: string; publicKey?: string; accountId?: string } | null;
  const provider = new JsonRpcProvider({ url: RPC });
  const exists = (accountId: string) => provider.viewAccount({ accountId }).then(() => true, () => false);
  const marker = (text: string) => `m${createHash('sha256').update(`${key}:${text}`).digest('hex').slice(0, 20)}.${purse}`;
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

    if (body?.ask === 'akun') {
      if (!/^ed25519:[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(body.publicKey ?? '')) return answer(400, { error: 'bad key' });
      const address = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
      const hour = Math.floor(Date.now() / 3_600_000);
      const slots = Array.from({ length: ACCOUNTS_PER_HOUR }, (_, i) => marker(`${address}|${hour}|${i}`));
      const taken = await Promise.all(slots.map(exists));
      const slot = slots.find((_, i) => !taken[i]);
      if (!slot || !(await claim(slot))) return answer(429, { error: 'too many accounts this hour' });
      const accountId = `${name(body.name)}-${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 4)}.${purse}`;
      await once(() => account.createAccount({ newAccountId: accountId, publicKey: body.publicKey!, nearToTransfer: NEW_ACCOUNT }), () => exists(accountId));
      return answer(200, { accountId });
    }

    if (body?.ask === 'isi') {
      const accountId = body.accountId ?? '';
      if (!accountId.endsWith(`.${purse}`)) return answer(400, { error: 'not one of ours' });
      const balance = BigInt((await provider.viewAccount({ accountId })).amount);
      if (balance >= LOW) return answer(200, { filled: false });
      if (!(await claim(marker(`isi|${accountId}`)))) return answer(429, { error: 'already topped up once' });
      await once(() => account.transfer({ receiverId: accountId, amount: TOP_UP }), async () => BigInt((await provider.viewAccount({ accountId })).amount) > balance);
      return answer(200, { filled: true });
    }
    return answer(400, { error: 'unknown request' });
  } catch {
    return answer(502, { error: 'network refused' });
  }
}
