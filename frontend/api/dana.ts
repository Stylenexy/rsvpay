import { Account, JsonRpcProvider, nearToYocto } from 'near-api-js';

/**
 * A small purse of test NEAR, so a visitor never depends on the public helper's limits.
 * Testnet only: the key behind it guards play money, and it can only make sub-accounts of itself and top them up.
 */

const RPC = 'https://test.rpc.fastnear.com';
const NEW_ACCOUNT = nearToYocto('1.5');
const TOP_UP = nearToYocto('1');
const LOW = BigInt(nearToYocto('1'));
// Keep enough for the purse to pay for its own transactions; past this the page falls back to the public helper.
const FLOOR = BigInt(nearToYocto('5'));

const answer = (status: number, body: unknown) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
const name = (text: unknown) => (typeof text === 'string' ? text.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 14) : '') || 'tamu';

async function retry<T>(send: () => Promise<T>) {
  try {
    return await send();
  } catch {
    // two visitors in the same second can collide on the purse's nonce
    await new Promise((r) => setTimeout(r, 900));
    return send();
  }
}

export async function POST(request: Request) {
  const purse = process.env.DANA_AKUN;
  const key = process.env.DANA_KUNCI;
  if (!purse || !key) return answer(503, { error: 'purse is not set up' });
  const body = (await request.json().catch(() => null)) as { ask?: string; name?: string; publicKey?: string; accountId?: string } | null;
  const provider = new JsonRpcProvider({ url: RPC });
  try {
    const left = BigInt((await provider.viewAccount({ accountId: purse })).amount);
    if (left < FLOOR) return answer(503, { error: 'purse is low' });
    const account = new Account(purse, provider, key as `ed25519:${string}`);
    if (body?.ask === 'akun') {
      if (!/^ed25519:[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(body.publicKey ?? '')) return answer(400, { error: 'bad key' });
      const accountId = `${name(body.name)}-${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 4)}.${purse}`;
      await retry(() => account.createAccount({ newAccountId: accountId, publicKey: body.publicKey!, nearToTransfer: NEW_ACCOUNT }));
      return answer(200, { accountId });
    }
    if (body?.ask === 'isi') {
      const accountId = body.accountId ?? '';
      if (!accountId.endsWith(`.${purse}`)) return answer(400, { error: 'not one of ours' });
      const balance = BigInt((await provider.viewAccount({ accountId })).amount);
      if (balance >= LOW) return answer(200, { filled: false });
      await retry(() => account.transfer({ receiverId: accountId, amount: TOP_UP }));
      return answer(200, { filled: true });
    }
    return answer(400, { error: 'unknown request' });
  } catch {
    return answer(502, { error: 'network refused' });
  }
}
