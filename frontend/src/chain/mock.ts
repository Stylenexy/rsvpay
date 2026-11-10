import { AMPLOP_ERRORS as E, type AccountId, type AmplopClient, type Entry, type Hajatan, type PendingReply, type Sent, type TokenId, type Yocto } from './types';
import { replyStorageYocto } from '../lib/rupiah';

/**
 * In-memory client that enforces the same rules as contract/src/lib.rs, for tests and
 * for working on screens offline (open the site with ?mock). Storage costs are fixed
 * estimates here; on chain they depend on the length of names and messages.
 */

const NEAR = 10n ** 24n;
export const MOCK_ENTRY_COST = (NEAR * 17n) / 10000n; // 0,0017
export const MOCK_OPEN_COST = (NEAR * 4n) / 1000n; // 0,004

interface Row {
  title: string;
  date: string;
  seedBps: number;
  open: boolean;
  owner: AccountId;
  balance: bigint;
  seedLocked: bigint;
  entries: Entry[];
}

export class MockAmplopClient implements AmplopClient {
  readonly mode = 'mock' as const;
  readonly contractId = 'amplop.mock';
  private rows = new Map<TokenId, Row>();
  private nextId = 1;
  private active: AccountId | null = null;
  private wallets = new Map<AccountId, bigint>();
  private clock = 1_793_000_000_000_000_000n;

  /**
   * The rehearsal opens on a book worth looking at: Maya & Leo (#1) with three gifts, and Sam & Nina (#2),
   * Sam's own celebration, so Maya's book rings. Every step goes through the same rules as a visitor's.
   * The methods hold no await, so the book exists before the first screen asks for it.
   */
  withSample() {
    const gift = (who: string, nearMilli: bigint, message: string) => {
      void this.createAccount(who);
      void this.give({ tokenId: '1', message, depositYocto: ((NEAR * nearMilli) / 1000n + MOCK_ENTRY_COST * 2n).toString() });
    };
    void this.createAccount('maya');
    const maya = this.active!;
    void this.openHajatan({ title: 'Maya & Leo', date: '2026-12-12', seedBps: 500, depositYocto: (NEAR / 20n).toString() });
    gift('sam', 200n, 'To a lifetime of happy days');
    const sam = this.active!;
    gift('priya', 500n, 'So happy for you both');
    gift('daniel', 100n, 'Congratulations, you two');
    this.active = sam;
    void this.openHajatan({ title: 'Sam & Nina', date: '2028-11-18', seedBps: 500, depositYocto: (NEAR / 20n).toString() });
    this.active = maya;
    return this;
  }

  account() {
    return this.active;
  }
  accounts() {
    return [...this.wallets.keys()];
  }
  useAccount(id: AccountId) {
    if (!this.wallets.has(id)) throw new Error(`no key for ${id} on this device`);
    this.active = id;
  }
  // rehearsal accounts have no keys to keep
  exportKey() {
    return null;
  }
  async importKey(): Promise<void> {
    throw new Error('key does not open this account');
  }
  async createAccount(name: string) {
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'tamu'}-${this.wallets.size + 1}.mock`;
    this.wallets.set(id, 10n * NEAR);
    this.active = id;
    return id;
  }
  async balance(id: AccountId) {
    return (this.wallets.get(id) ?? 0n).toString();
  }

  async createSubAccount(name: string, funding: Yocto) {
    const id = `${name.toLowerCase()}.${this.me()}`;
    if (this.wallets.has(id)) throw new Error('account already exists');
    this.pay(BigInt(funding));
    this.wallets.set(id, BigInt(funding));
    this.active = id;
    return this.sent(id);
  }

  async transfer(tokenId: TokenId, receiverId: AccountId) {
    const r = this.row(tokenId);
    if (r.owner !== this.me()) throw new Error('only the current holder');
    if (receiverId === r.owner) throw new Error('receiver is already holder');
    r.owner = receiverId;
    return this.sent(null);
  }

  private me(): AccountId {
    if (!this.active) throw new Error('no account on this device');
    return this.active;
  }
  private pay(deposit: bigint) {
    const me = this.me();
    const have = this.wallets.get(me) ?? 0n;
    if (have < deposit) throw new Error('not enough balance');
    this.wallets.set(me, have - deposit);
  }
  private row(id: TokenId): Row {
    const r = this.rows.get(id);
    if (!r) throw new Error(E.noSuchAmplop);
    return r;
  }
  private tick() {
    this.clock += 1_000_000_000n;
    return this.clock.toString();
  }
  /** credit `net` into `id` as entry `e`: seed = net × bps / 10000 locked for the giver */
  private credit(id: TokenId, e: Entry, net: bigint) {
    const r = this.row(id);
    const seed = (net * BigInt(r.seedBps)) / 10000n;
    e.amount = net.toString();
    e.seed = seed.toString();
    r.balance += net;
    r.seedLocked += seed;
  }
  private sent<T>(value: T): Sent<T> {
    return { value, txHash: null };
  }

  async openHajatan(a: { title: string; date: string; seedBps: number; depositYocto: Yocto }) {
    if (a.seedBps < 0 || a.seedBps > 1000) throw new Error(E.seedRange);
    if (!a.title.trim()) throw new Error(E.titleRequired);
    const dep = BigInt(a.depositYocto);
    if (dep < MOCK_OPEN_COST) throw new Error(E.openDeposit);
    this.pay(dep);
    const id = String(this.nextId++);
    this.rows.set(id, { title: a.title, date: a.date, seedBps: a.seedBps, open: true, owner: this.me(), balance: dep - MOCK_OPEN_COST, seedLocked: 0n, entries: [] });
    return this.sent(id);
  }

  async give(a: { tokenId: TokenId; message: string; depositYocto: Yocto }) {
    if ([...a.message].length > 280) throw new Error(E.messageTooLong);
    const r = this.row(a.tokenId);
    if (!r.open) throw new Error(E.closed);
    const dep = BigInt(a.depositYocto);
    if (dep <= MOCK_ENTRY_COST) throw new Error(E.depositTooSmall);
    this.pay(dep);
    const e: Entry = { index: r.entries.length, giver: this.me(), amount: '0', seed: '0', message: a.message, at: this.tick(), reply_to: null, replied: null };
    r.entries.push(e);
    this.credit(a.tokenId, e, dep - MOCK_ENTRY_COST);
    return this.sent(e.index);
  }

  async reciprocate(a: { tokenId: TokenId; entry: number; toTokenId: TokenId; message: string; depositYocto: Yocto }) {
    const r = this.row(a.tokenId);
    if (r.owner !== this.me()) throw new Error('only the current holder of the amplop can do this');
    if (a.toTokenId === a.tokenId) throw new Error(E.sameAmplop);
    const old = r.entries[a.entry];
    if (!old) throw new Error('no such entry');
    if (old.replied) throw new Error(E.alreadyReplied);
    const t = this.row(a.toTokenId);
    if (!t.open) throw new Error(E.targetClosed);
    if (t.owner !== old.giver) throw new Error(E.wrongTarget);
    const dep = BigInt(a.depositYocto);
    const seed = BigInt(old.seed);
    const total = seed + dep;
    // a reply's storage is counted the way the contract charges it, so the rehearsal lands the same amount as the chain
    const cost = replyStorageYocto({ from: a.tokenId, to: a.toTokenId, caller: this.me(), message: a.message });
    if (dep < cost || total <= cost) throw new Error(E.replyStorage);
    this.pay(dep);
    r.balance -= seed;
    r.seedLocked -= seed;
    const e: Entry = { index: t.entries.length, giver: this.me(), amount: '0', seed: '0', message: a.message, at: this.tick(), reply_to: { token_id: a.tokenId, entry: a.entry }, replied: null };
    t.entries.push(e);
    old.seed = '0';
    old.replied = { token_id: a.toTokenId, entry: e.index };
    this.credit(a.toTokenId, e, total - cost);
    return this.sent(e.index);
  }

  async withdraw(tokenId: TokenId) {
    const r = this.row(tokenId);
    if (r.owner !== this.me()) throw new Error('only the current holder of the amplop can do this');
    const free = r.balance - r.seedLocked;
    if (free <= 0n) throw new Error(E.nothingFree);
    r.balance -= free;
    this.wallets.set(r.owner, (this.wallets.get(r.owner) ?? 0n) + free);
    return this.sent(null);
  }

  private view(id: TokenId, r: Row): Hajatan {
    return {
      token_id: id,
      owner_id: r.owner,
      title: r.title,
      date: r.date,
      seed_bps: r.seedBps,
      open: r.open,
      balance: r.balance.toString(),
      seed_locked: r.seedLocked.toString(),
      free: (r.balance - r.seedLocked).toString(),
      entries: r.entries.length,
    };
  }

  async hajatan(id: TokenId) {
    const r = this.rows.get(id);
    return r ? this.view(id, r) : null;
  }
  async hajatanOf(acc: AccountId) {
    return [...this.rows].filter(([, r]) => r.owner === acc).map(([id, r]) => this.view(id, r));
  }
  async entries(id: TokenId, from = 0, limit = 100) {
    return this.row(id).entries.slice(from, from + limit).map((e) => ({ ...e }));
  }
  /** unreplied gifts whose giver now holds an open hajatan (their newest one) */
  async pendingReplies(id: TokenId): Promise<PendingReply[]> {
    const out: PendingReply[] = [];
    for (const e of this.row(id).entries) {
      if (e.replied) continue;
      const theirs = [...this.rows].filter(([tid, r]) => r.owner === e.giver && r.open && tid !== id);
      const target = theirs[theirs.length - 1];
      if (target) out.push({ entry: e.index, giver: e.giver, amount: e.amount, seed: e.seed, to_token_id: target[0] });
    }
    return out;
  }
  explorerTx() {
    return '';
  }
}
