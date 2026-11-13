import { Account, JsonRpcProvider, KeyPair, actions, getTransactionLastResult, teraToGas } from 'near-api-js';
import type { AccountId, AmplopClient, Entry, Hajatan, PendingReply, Sent, TokenId, Yocto } from './types';
import { rememberHistoryTransaction } from './history';
import { freshNonce, nep413Sign, nep413Verify, type HolderProof } from './holder';
import { walkPages } from './paging';

/**
 * Live client on NEAR TESTNET. No secrets ship with the site:
 * - each device makes its own test accounts, funded with test NEAR by the project's small
 *   testnet purse (/api/dana) or else the public helper, and keeps their keys in localStorage;
 * - the contract is the keyless deployment from SPK-A1 (nobody, us included, can change it).
 * Testnet only: the keys here guard play money.
 */

const RPC = 'https://test.rpc.fastnear.com';
const HELPER = 'https://helper.nearprotocol.com/account';
const PURSE = '/api/dana';
// room for gas and storage on top of what a call sends
const SPARE = 10n ** 23n;
export const DEFAULT_CONTRACT = 'rsvpay-v2.testnet';
const GAS = teraToGas('100');
const KEYS = 'amplop.kunci';
const ACTIVE = 'amplop.akun';

export interface KeyStore {
  keys(): Record<AccountId, string>;
  saveKey(id: AccountId, secret: string): void;
  active(): AccountId | null;
  setActive(id: AccountId): void;
}

/** localStorage, with an in-memory fallback for private windows */
export function browserKeyStore(): KeyStore {
  const mem: Record<string, string> = {};
  const read = (k: string) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return mem[k] ?? null;
    }
  };
  const write = (k: string, v: string) => {
    mem[k] = v;
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* memory only */
    }
  };
  return {
    keys: () => {
      try {
        return JSON.parse(read(KEYS) || '{}');
      } catch {
        return {};
      }
    },
    saveKey(id, secret) {
      write(KEYS, JSON.stringify({ ...this.keys(), [id]: secret }));
    },
    active: () => read(ACTIVE),
    setActive: (id) => write(ACTIVE, id),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** "Budi Santoso" → "budisantoso" (account ids allow a-z, 0-9, - and _) */
export function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 14) || 'tamu'
  );
}

export class NearAmplopClient implements AmplopClient {
  readonly mode = 'testnet' as const;
  private provider: JsonRpcProvider;

  constructor(
    readonly contractId: string = DEFAULT_CONTRACT,
    private store: KeyStore = browserKeyStore(),
  ) {
    if (contractId !== DEFAULT_CONTRACT) throw new Error('only the fixed testnet deployment is supported');
    this.provider = new JsonRpcProvider({ url: RPC });
  }

  // ---- accounts ----

  account(): AccountId | null {
    const id = this.store.active();
    return id && this.store.keys()[id] ? id : null;
  }

  accounts(): AccountId[] {
    return Object.keys(this.store.keys());
  }

  useAccount(id: AccountId): void {
    if (!this.store.keys()[id]) throw new Error(`no key for ${id} on this device`);
    this.store.setActive(id);
  }

  exportKey(): string | null {
    const id = this.account();
    return id ? this.store.keys()[id] ?? null : null;
  }

  async importKey(accountId: AccountId, secret: string): Promise<void> {
    const publicKey = KeyPair.fromString(secret as `ed25519:${string}`).getPublicKey().toString();
    const { keys } = await this.provider.viewAccessKeyList({ accountId });
    if (!keys.some((k) => k.public_key === publicKey)) throw new Error('key does not open this account');
    this.store.saveKey(accountId, secret);
    this.store.setActive(accountId);
  }

  async createAccount(name: string): Promise<AccountId> {
    const kp = KeyPair.fromRandom('ed25519');
    const id = (await this.fromPurse(name, kp.getPublicKey().toString())) ?? (await this.fromHelper(name, kp.getPublicKey().toString()));
    // keep the key before anything else can fail, or the funded account is lost
    this.store.saveKey(id, kp.toString());
    this.store.setActive(id);
    for (let i = 0; i < 24; i++) {
      try {
        await this.provider.viewAccount({ accountId: id });
        return id;
      } catch {
        await sleep(1200);
      }
    }
    throw new Error('account did not appear in time');
  }

  private async fromPurse(name: string, publicKey: string): Promise<AccountId | null> {
    try {
      const res = await fetch(PURSE, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ask: 'akun', name, publicKey }), signal: AbortSignal.timeout(25_000) });
      return res.ok ? ((await res.json()) as { accountId: AccountId }).accountId : null;
    } catch {
      return null;
    }
  }

  private async fromHelper(name: string, publicKey: string): Promise<AccountId> {
    const id = `${slug(name)}-${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 4)}.testnet`;
    const res = await fetch(HELPER, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ newAccountId: id, newAccountPublicKey: publicKey }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`helper ${res.status}: ${(await res.text()).slice(0, 160)}`);
    return id;
  }

  /** Play money should never be the reason a test stops, so a low account asks the purse before it sends. */
  private async topUp(deposit: bigint) {
    const accountId = this.account();
    if (!accountId || BigInt(await this.balance(accountId)) >= deposit + SPARE) return;
    await fetch(PURSE, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ask: 'isi', accountId }), signal: AbortSignal.timeout(25_000) }).catch(() => undefined);
  }

  async balance(accountId: AccountId): Promise<Yocto> {
    const a = await this.provider.viewAccount({ accountId });
    return a.amount.toString();
  }

  async createSubAccount(name: string, funding: Yocto): Promise<Sent<AccountId>> {
    const parent = this.signer();
    const id = `${slug(name)}-${Date.now().toString(36).slice(-5)}.${parent.accountId}`;
    if (id.length > 64) throw new Error('child account name too long');
    const kp = KeyPair.fromRandom('ed25519');
    // Persist before broadcasting: an uncertain RPC response must not lose the child's key.
    this.store.saveKey(id, kp.toString());
    const res = await parent.signAndSendTransaction({ receiverId: id,
      actions: [actions.createAccount(), actions.transfer(BigInt(funding)), actions.addFullAccessKey(kp.getPublicKey())],
      waitUntil: 'FINAL' });
    const status = res.status;
    if (status && typeof status === 'object' && 'Failure' in status) throw new Error(JSON.stringify(status.Failure));
    this.store.setActive(id);
    return { value: id, txHash: res.transaction.hash };
  }

  // ---- calls ----

  private signer(): Account {
    const id = this.account();
    if (!id) throw new Error('no account on this device');
    return new Account(id, this.provider, this.store.keys()[id] as `ed25519:${string}`);
  }

  private async call<T>(methodName: string, args: Record<string, unknown>, deposit: bigint = 0n): Promise<Sent<T>> {
    if (deposit > 1n) await this.topUp(deposit).catch(() => undefined);
    const res = await this.signer().callFunctionRaw({
      contractId: this.contractId,
      methodName,
      args,
      deposit,
      gas: GAS,
      waitUntil: 'FINAL',
    });
    const status = (res as { status?: unknown }).status;
    if (status && typeof status === 'object' && 'Failure' in status) {
      throw new Error(JSON.stringify((status as { Failure: unknown }).Failure));
    }
    const hash = (res as { transaction?: { hash?: string } }).transaction?.hash ?? null;
    rememberHistoryTransaction(this.contractId, res);
    return { value: getTransactionLastResult(res) as T, txHash: hash };
  }

  private async view<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
    return (await this.provider.callFunction({ contractId: this.contractId, method, args })) as T;
  }

  async openHajatan(a: { title: string; date: string; seedBps: number; depositYocto: Yocto }): Promise<Sent<TokenId>> {
    const r = await this.call<{ token_id: TokenId }>(
      'open_hajatan',
      { title: a.title, date: a.date, seed_bps: a.seedBps },
      BigInt(a.depositYocto),
    );
    return { value: r.value.token_id, txHash: r.txHash };
  }

  give(a: { tokenId: TokenId; message: string; depositYocto: Yocto }): Promise<Sent<number>> {
    return this.call<number>('give', { token_id: a.tokenId, message: a.message }, BigInt(a.depositYocto));
  }

  reciprocate(a: { tokenId: TokenId; entry: number; toTokenId: TokenId; message: string; depositYocto: Yocto }): Promise<Sent<number>> {
    return this.call<number>(
      'reciprocate',
      { token_id: a.tokenId, entry: a.entry, to_token_id: a.toTokenId, message: a.message },
      BigInt(a.depositYocto),
    );
  }

  async withdraw(tokenId: TokenId): Promise<Sent<null>> {
    const r = await this.call<unknown>('withdraw', { token_id: tokenId });
    return { value: null, txHash: r.txHash };
  }

  async transfer(tokenId: TokenId, receiverId: AccountId): Promise<Sent<null>> {
    await this.provider.viewAccount({ accountId: receiverId });
    const r = await this.call<unknown>('nft_transfer', { token_id: tokenId, receiver_id: receiverId }, 1n);
    return { value: null, txHash: r.txHash };
  }

  // ---- views ----

  async hajatan(tokenId: TokenId): Promise<Hajatan | null> {
    return (await this.view<Hajatan | null>('hajatan', { token_id: tokenId })) ?? null;
  }

  async hajatanOf(accountId: AccountId): Promise<Hajatan[]> {
    return (await this.view<Hajatan[]>('hajatan_of', { account_id: accountId })) ?? [];
  }

  async entries(tokenId: TokenId, from = 0, limit = 100): Promise<Entry[]> {
    return (await this.view<Entry[]>('entries', { token_id: tokenId, from, limit })) ?? [];
  }

  async pendingReplies(tokenId: TokenId): Promise<PendingReply[]> {
    const h = await this.hajatan(tokenId);
    // the contract reads 50 entries unless told otherwise, so walk the whole book in pages;
    // a giver holding many envelopes makes a page heavy, and walkPages splits it
    const { rows } = await walkPages(h?.entries ?? 0, async (from, limit) =>
      (await this.view<PendingReply[]>('pending_replies', { token_id: tokenId, from, limit })) ?? []);
    return rows;
  }

  async proveHolder(tokenId: TokenId): Promise<HolderProof | null> {
    const id = this.account();
    if (!id) return null;
    const secret = this.store.keys()[id];
    try {
      const token = await this.view<{ owner_id: string } | null>('nft_token', { token_id: tokenId });
      if (!token || token.owner_id !== id) return null;
      const m = { message: `RSVPay: open the book of envelope ${tokenId} as ${id}`, nonce: freshNonce(), recipient: this.contractId };
      const signed = await nep413Sign(secret, m);
      // throws when the chain does not list this public key for the account
      await this.provider.viewAccessKey({ accountId: id, publicKey: signed.publicKey });
      if (!(await nep413Verify(signed.publicKey, m, signed.signature))) return null;
      return { accountId: id, publicKey: signed.publicKey, message: m.message, at: Date.now() };
    } catch {
      return null;
    }
  }

  explorerTx(hash: string): string {
    return `https://testnet.nearblocks.io/txns/${hash}`;
  }
}
