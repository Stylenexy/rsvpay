import { Account, JsonRpcProvider, KeyPair, getTransactionLastResult, teraToGas } from 'near-api-js';
import type { AccountId, AmplopClient, Entry, Hajatan, PendingReply, Sent, TokenId, Yocto } from './types';

/**
 * Live client on NEAR TESTNET. No secrets ship with the site:
 * - each device makes its own test accounts through the public testnet helper
 *   (the helper funds them with test NEAR), and keeps their keys in localStorage;
 * - the contract is the keyless deployment from SPK-A1 (nobody, us included, can change it).
 * Testnet only: the keys here guard play money.
 */

const RPC = import.meta.env.VITE_NEAR_RPC ?? 'https://test.rpc.fastnear.com';
const HELPER = 'https://helper.nearprotocol.com/account';
export const DEFAULT_CONTRACT = import.meta.env.VITE_AMPLOP_CONTRACT ?? 'amplop-c-mvznhnlx.testnet';
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

  async createAccount(name: string): Promise<AccountId> {
    const id = `${slug(name)}-${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 4)}.testnet`;
    const kp = KeyPair.fromRandom('ed25519');
    const res = await fetch(HELPER, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ newAccountId: id, newAccountPublicKey: kp.getPublicKey().toString() }),
    });
    if (!res.ok) throw new Error(`helper ${res.status}: ${(await res.text()).slice(0, 160)}`);
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

  async balance(accountId: AccountId): Promise<Yocto> {
    const a = await this.provider.viewAccount({ accountId });
    return a.amount.toString();
  }

  // ---- calls ----

  private signer(): Account {
    const id = this.account();
    if (!id) throw new Error('no account on this device');
    return new Account(id, this.provider, this.store.keys()[id] as `ed25519:${string}`);
  }

  private async call<T>(methodName: string, args: Record<string, unknown>, deposit: bigint = 0n): Promise<Sent<T>> {
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
    return (await this.view<PendingReply[]>('pending_replies', { token_id: tokenId })) ?? [];
  }

  explorerTx(hash: string): string {
    return `https://testnet.nearblocks.io/txns/${hash}`;
  }
}
