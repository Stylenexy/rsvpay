/**
 * Client interface that mirrors the Amplop Balas contract (SPEC.md §4) one to one.
 * Pages only talk to this interface. The live testnet client (near.ts) and the
 * in-memory mock (mock.ts) both implement it.
 *
 * Money is always a decimal string of yoctoNEAR (1 NEAR = 10^24), like U128 in the contract.
 * Change methods are signed by the active account (see `account()`).
 */

export type Yocto = string;
export type AccountId = string;
export type TokenId = string;

/** contract view `hajatan` */
export interface Hajatan {
  token_id: TokenId;
  owner_id: AccountId;
  title: string;
  date: string;
  /** 0..1000 = 0..10% */
  seed_bps: number;
  open: boolean;
  balance: Yocto;
  seed_locked: Yocto;
  free: Yocto;
  entries: number;
}

export interface EntryRef {
  token_id: TokenId;
  entry: number;
}

/** contract view `entries` (EntryView with the entry flattened) */
export interface Entry {
  index: number;
  giver: AccountId;
  amount: Yocto;
  /** seed still locked for this giver; 0 once replied */
  seed: Yocto;
  message: string;
  /** nanoseconds since epoch, as a string */
  at: string;
  reply_to: EntryRef | null;
  replied: EntryRef | null;
}

/** contract view `pending_replies` */
export interface PendingReply {
  entry: number;
  giver: AccountId;
  amount: Yocto;
  seed: Yocto;
  to_token_id: TokenId;
}

/** A change call result plus the transaction hash, so the screen can link to the proof. */
export interface Sent<T> {
  value: T;
  txHash: string | null;
}

export interface AmplopClient {
  readonly mode: 'testnet' | 'mock';
  readonly contractId: string;

  // ---- accounts on this device ----
  /** the account that signs change calls, or null before one exists */
  account(): AccountId | null;
  /** all accounts whose keys live on this device */
  accounts(): AccountId[];
  useAccount(id: AccountId): void;
  /** make a fresh funded test account (testnet helper) and switch to it */
  createAccount(name: string): Promise<AccountId>;
  /** Create and fund a child using the active account, without the public helper. */
  createSubAccount(name: string, funding: Yocto): Promise<Sent<AccountId>>;
  /** spendable balance of an account */
  balance(accountId: AccountId): Promise<Yocto>;

  // ---- change methods ----
  openHajatan(args: { title: string; date: string; seedBps: number; depositYocto: Yocto }): Promise<Sent<TokenId>>;
  give(args: { tokenId: TokenId; message: string; depositYocto: Yocto }): Promise<Sent<number>>;
  reciprocate(args: {
    tokenId: TokenId;
    entry: number;
    toTokenId: TokenId;
    message: string;
    depositYocto: Yocto;
  }): Promise<Sent<number>>;
  withdraw(tokenId: TokenId): Promise<Sent<null>>;
  transfer(tokenId: TokenId, receiverId: AccountId): Promise<Sent<null>>;

  // ---- view methods ----
  hajatan(tokenId: TokenId): Promise<Hajatan | null>;
  hajatanOf(accountId: AccountId): Promise<Hajatan[]>;
  entries(tokenId: TokenId, from?: number, limit?: number): Promise<Entry[]>;
  pendingReplies(tokenId: TokenId): Promise<PendingReply[]>;

  /** public explorer page for a transaction (empty for the mock) */
  explorerTx(hash: string): string;
}

/** Exact panic texts from contract/src/lib.rs, used to show plain Indonesian messages. */
export const AMPLOP_ERRORS = {
  noSuchAmplop: 'no such amplop',
  closed: 'this hajatan is not accepting gifts',
  messageTooLong: 'message too long',
  depositTooSmall: 'deposit must cover storage and leave a gift',
  openDeposit: 'deposit must cover storage of the amplop',
  seedRange: 'seed_bps must be 0..=1000 (max 10%)',
  titleRequired: 'title required',
  notHolder: 'only the current holder',
  midTransfer: 'amplop is mid-transfer',
  alreadyReplied: 'this gift was already replied to',
  sameAmplop: 'cannot reply into the same amplop',
  wrongTarget: 'reply must go to a hajatan held by the original giver',
  targetClosed: "the giver's hajatan is not accepting gifts",
  replyStorage: 'seed plus deposit must cover storage of the reply',
  nothingFree: 'nothing to withdraw',
} as const;
