import type { AmplopClient, Entry, Hajatan } from './types';

const INDEXER = 'https://api-testnet.nearblocks.io';
const RPC = 'https://test.rpc.fastnear.com';
export type HistoryKind = 'gift' | 'replyIn' | 'replyOut' | 'holder' | 'opened' | 'paid' | 'refund';
export interface HistoryEvent {
  id: string; kind: HistoryKind; at: string | null; hash: string | null;
  amount?: string; from?: string; to?: string; peer?: string;
}
export interface EnvelopeHistory {
  events: HistoryEvent[]; earned: string; paid: string | null;
  coverage: 'indexed' | 'partial' | 'unavailable';
}
interface IndexedTx { transaction_hash: string; signer_account_id?: string; predecessor_account_id?: string; block_timestamp: string }
interface Outcome { id?: string; block_hash?: string; outcome: { executor_id: string; logs: string[]; status: Record<string, unknown> } }
interface TransactionEvidence {
  transaction: { hash: string; receiver_id: string; signer_id?: string };
  receipts_outcome: Outcome[];
}
interface JournalItem { hash: string; signer: string; tokens: string[] }
const recent = new Map<string, TransactionEvidence>();
const memoryJournal = new Map<string, JournalItem[]>();
const journalKey = (contract: string) => `amplop.receipts.${contract}`;

function journal(contract: string): JournalItem[] {
  try {
    const saved = localStorage.getItem(journalKey(contract));
    if (saved === null) return memoryJournal.get(contract) ?? [];
    const value: unknown = JSON.parse(saved);
    if (Array.isArray(value)) return value.filter((r): r is JournalItem => r && typeof r.hash === 'string' && typeof r.signer === 'string' && Array.isArray(r.tokens) && r.tokens.every((id: unknown) => typeof id === 'string')).slice(-100);
  } catch { /* Memory-only in private browsing and unit tests. */ }
  return memoryJournal.get(contract) ?? [];
}

/** Public receipt references only. Never persist a signer object or any keys here. */
export function rememberHistoryTransaction(contract: string, value: unknown): void {
  const tx = value as TransactionEvidence;
  if (!tx?.transaction?.hash || !tx.transaction.signer_id || tx.transaction.receiver_id !== contract || !Array.isArray(tx.receipts_outcome)) return;
  const tokens = new Set<string>();
  for (const { outcome: o } of tx.receipts_outcome) {
    if (o.executor_id !== contract) continue;
    for (const log of o.logs) {
      if (log.startsWith('amplop:')) for (const m of log.matchAll(/(?:^|\s)(?:token|from|to)=(\d+)(?:\s|$)/g)) tokens.add(m[1]);
      if (log.startsWith('EVENT_JSON:')) {
        try {
          const e = JSON.parse(log.slice('EVENT_JSON:'.length));
          if (e.standard === 'nep171' && Array.isArray(e.data)) for (const d of e.data) {
            if (Array.isArray(d.token_ids)) for (const id of d.token_ids) if (typeof id === 'string') tokens.add(id);
          }
        } catch { /* Unrelated log. */ }
      }
    }
  }
  if (!tokens.size) return;
  recent.set(tx.transaction.hash, tx);
  const rows = [...journal(contract).filter((r) => r.hash !== tx.transaction.hash),
    { hash: tx.transaction.hash, signer: tx.transaction.signer_id, tokens: [...tokens] }].slice(-100);
  memoryJournal.set(contract, rows);
  try { localStorage.setItem(journalKey(contract), JSON.stringify(rows)); } catch { /* Memory-only. */ }
}

/** Only successful receipts executed by this deployment can supply its events. */
export function parseHistoryEvents(token: string, contract: string, tx: TransactionEvidence, at: string | null): HistoryEvent[] {
  const out: HistoryEvent[] = [];
  for (const receipt of tx.receipts_outcome) {
    const o = receipt.outcome;
    if (o.executor_id !== contract || !('SuccessValue' in o.status || 'SuccessReceiptId' in o.status)) continue;
    for (const log of o.logs) {
      const hash = tx.transaction.hash;
      const receiptKey = receipt.id ?? receipt.block_hash ?? String(tx.receipts_outcome.indexOf(receipt));
      const add = (event: Omit<HistoryEvent, 'hash' | 'at'>) => out.push({ ...event, hash, at });
      const head = /^amplop:(open|give|reply|paid|payout_failed_refunded) /.exec(log)?.[1];
      const fields = Object.fromEntries([...log.matchAll(/(?:^|\s)(\w+)=([^\s]+)/g)].map((m) => [m[1], m[2]]));
      const amount = /^\d+$/.test(fields.yocto ?? '') ? fields.yocto : undefined;
      if (head === 'give' && fields.token === token && amount) add({ id: `in:${fields.entry}`, kind: 'gift', amount, from: fields.giver });
      if (head === 'open' && fields.token === token) add({ id: 'opened', kind: 'opened', to: fields.host });
      if (head === 'reply' && fields.to === token && amount) add({ id: `in:${fields.to_entry}`, kind: 'replyIn', amount, peer: fields.from });
      if (head === 'reply' && fields.from === token && amount) add({ id: `out:${fields.entry}`, kind: 'replyOut', amount, peer: fields.to });
      if ((head === 'paid' || head === 'payout_failed_refunded') && fields.token === token && amount) {
        add({ id: `${head}:${hash}:${receiptKey}:${o.logs.indexOf(log)}`, kind: head === 'paid' ? 'paid' : 'refund', amount });
      }
      if (!log.startsWith('EVENT_JSON:')) continue;
      try {
        const event = JSON.parse(log.slice('EVENT_JSON:'.length));
        if (event.standard !== 'nep171' || event.event !== 'nft_transfer' || !Array.isArray(event.data)) continue;
        for (const data of event.data) {
          if (Array.isArray(data.token_ids) && data.token_ids.includes(token) && typeof data.old_owner_id === 'string' && typeof data.new_owner_id === 'string') {
            add({ id: `holder:${hash}:${receiptKey}:${o.logs.indexOf(log)}:${event.data.indexOf(data)}`, kind: 'holder', from: data.old_owner_id, to: data.new_owner_id });
          }
        }
      } catch { /* Unrelated or malformed logs are not evidence. */ }
    }
  }
  return out;
}

export function mergeHistory(chain: HistoryEvent[], indexed: HistoryEvent[]): HistoryEvent[] {
  const merged = new Map(chain.map((e) => [e.id, e]));
  for (const e of indexed) merged.set(e.id, { ...merged.get(e.id), ...e, at: e.at ?? merged.get(e.id)?.at ?? null });
  return [...merged.values()].sort((a, b) => {
    if (!a.at || !b.at) return a.at ? -1 : b.at ? 1 : 0;
    return BigInt(a.at) < BigInt(b.at) ? -1 : BigInt(a.at) > BigInt(b.at) ? 1 : 0;
  });
}

async function json(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...init, signal: init?.signal ?? AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`history ${response.status}`);
  return response.json();
}

async function receiptEvidence(hash: string, signer: string, contract: string, signal?: AbortSignal): Promise<TransactionEvidence> {
  const cached = recent.get(hash);
  if (cached) return cached;
  const response = await json(RPC, { method: 'POST', signal, headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'history', method: 'EXPERIMENTAL_tx_status', params: [hash, signer] }) }) as { result?: TransactionEvidence };
  const tx = response.result;
  if (!tx?.transaction || !Array.isArray(tx.receipts_outcome) || tx.transaction.hash !== hash || tx.transaction.receiver_id !== contract) throw new Error('history evidence missing');
  recent.set(hash, tx);
  return tx;
}

const blockTimes = new Map<string, string>();
async function receiptEvents(token: string, contract: string, tx: TransactionEvidence, signal?: AbortSignal): Promise<HistoryEvent[]> {
  const events: HistoryEvent[] = [];
  for (const receipt of tx.receipts_outcome.filter((r) => r.outcome.executor_id === contract)) {
    let at = receipt.block_hash ? blockTimes.get(receipt.block_hash) ?? null : null;
    if (!at && receipt.block_hash) {
      try {
        const data = await json(RPC, { method: 'POST', signal, headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 'history-time', method: 'block', params: { block_id: receipt.block_hash } }) }) as { result?: { header?: { timestamp_nanosec?: string } } };
        const timestamp = data.result?.header?.timestamp_nanosec;
        if (timestamp && /^\d{1,20}$/.test(timestamp)) { at = timestamp; blockTimes.set(receipt.block_hash, at); }
      } catch { /* A verified event without a time is still useful; never guess a time. */ }
    }
    events.push(...parseHistoryEvents(token, contract, { ...tx, receipts_outcome: [receipt] }, at));
  }
  return events;
}

async function indexedHistory(h: Hajatan, contract: string, signal: AbortSignal) {
  const rows: IndexedTx[] = [];
  let exhaustive = false;
  // Bound work on a public service. A truncated scan is always labelled incomplete.
  for (let page = 1; page <= 4; page++) {
    const data = await json(`${INDEXER}/v1/account/${encodeURIComponent(contract)}/txns?per_page=25&page=${page}&order=desc`, { signal }) as { txns?: IndexedTx[] };
    if (!Array.isArray(data.txns)) throw new Error('history response missing');
    rows.push(...data.txns);
    if (data.txns.length < 25) { exhaustive = true; break; }
  }
  if (!rows.length) throw new Error('history index is empty');
  const events: HistoryEvent[] = [];
  let failed = false;
  const seen = new Set<string>();
  for (let from = 0; from < rows.length; from += 4) {
    const results = await Promise.allSettled(rows.slice(from, from + 4).map(async (row) => {
      const signer = row.signer_account_id ?? row.predecessor_account_id;
      if (!row.transaction_hash || !signer) throw new Error('incomplete history row');
      if (seen.has(row.transaction_hash)) return [];
      seen.add(row.transaction_hash);
      const tx = await receiptEvidence(row.transaction_hash, signer, contract, signal);
      return parseHistoryEvents(h.token_id, contract, tx, /^\d+$/.test(String(row.block_timestamp)) ? String(row.block_timestamp) : null);
    }));
    for (const r of results) { if (r.status === 'fulfilled') events.push(...r.value); else failed = true; }
  }
  const incoming = events.filter((e) => e.kind === 'gift' || e.kind === 'replyIn');
  const holders = events.filter((e) => e.kind === 'opened' || e.kind === 'holder');
  const orderedHolders = mergeHistory([], holders);
  const latest = orderedHolders.at(-1);
  const complete = exhaustive && !failed && events.some((e) => e.kind === 'opened') &&
    new Set(incoming.map((e) => e.id)).size === h.entries && latest?.to === h.owner_id;
  return { events, complete };
}

export async function loadEnvelopeHistory(client: AmplopClient, h: Hajatan): Promise<EnvelopeHistory> {
  const entries: Entry[] = [];
  for (let from = 0; from < h.entries; from += 100) entries.push(...await client.entries(h.token_id, from, 100));
  const chain: HistoryEvent[] = entries.map((e) => ({ id: `in:${e.index}`, kind: e.reply_to ? 'replyIn' : 'gift',
    at: e.at, hash: null, amount: e.amount, from: e.giver, peer: e.reply_to?.token_id }));
  // Both sides of a reply are stored by the contract; read the destination for amount and time.
  for (const e of entries.filter((e) => e.replied)) {
    try {
      const ref = e.replied!;
      const [reply] = await client.entries(ref.token_id, ref.entry, 1);
      if (reply?.reply_to?.token_id === h.token_id && reply.reply_to.entry === e.index) {
        chain.push({ id: `out:${e.index}`, kind: 'replyOut', at: reply.at, hash: null, amount: reply.amount, peer: ref.token_id });
      }
    } catch { /* Keep the original incoming gift if the related view is unavailable. */ }
  }
  const earned = entries.reduce((sum, e) => sum + BigInt(e.amount), 0n).toString();
  // One deadline for all optional history lookups, rather than a fresh wait per page.
  const signal = AbortSignal.timeout(15_000);
  const local: HistoryEvent[] = [];
  if (client.mode === 'testnet') {
    const refs = journal(client.contractId).filter((r) => r.tokens.includes(h.token_id));
    for (let from = 0; from < refs.length; from += 4) {
      const results = await Promise.allSettled(refs.slice(from, from + 4).map(async (r) =>
        receiptEvents(h.token_id, client.contractId, await receiptEvidence(r.hash, r.signer, client.contractId, signal), signal)));
      for (const r of results) if (r.status === 'fulfilled') local.push(...r.value);
    }
  }
  const withLocal = mergeHistory(chain, local);
  try {
    if (client.mode !== 'testnet') throw new Error('no public index for rehearsal');
    const indexed = await indexedHistory(h, client.contractId, signal);
    const events = mergeHistory(withLocal, indexed.events);
    const payouts = events.filter((e) => e.kind === 'paid');
    return { events, earned, paid: payouts.length || indexed.complete ? payouts.reduce((sum, e) => sum + BigInt(e.amount!), 0n).toString() : null,
      coverage: indexed.complete ? 'indexed' : indexed.events.length || local.length ? 'partial' : 'unavailable' };
  } catch {
    const payouts = withLocal.filter((e) => e.kind === 'paid');
    return { events: withLocal, earned, paid: payouts.length ? payouts.reduce((sum, e) => sum + BigInt(e.amount!), 0n).toString() : null, coverage: local.length ? 'partial' : 'unavailable' };
  }
}
