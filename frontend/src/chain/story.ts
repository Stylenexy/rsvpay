import type { AmplopClient, Entry, PendingReply, Sent } from './types';
import { OPEN_DEPOSIT_YOCTO, STORAGE_MARGIN_YOCTO, rupiahToYocto } from '../lib/rupiah';

export type StoryStep = 'account' | 'family' | 'wedding' | 'gift' | 'years' | 'celebration' | 'ring' | 'reply';
export interface StoryMark { step: StoryStep; ms: number; hash: string | null }
export interface StorySession { siti: string; budi: string; wedding: string; celebration: string; pending: PendingReply }
export interface StoryWishes { gift: string; reply: string }
export const RECORDED = [
  { step: 'wedding', hash: '9cDvqFm9hBvdZgxFrHdL5PViAvGEtev5F1ZYYnhrwdxk' },
  { step: 'gift', hash: '23fkWd22hwQKgFJc8aFxJrLpQJg42PbDaX3PwL5Ci71u' },
  { step: 'reply', hash: '53gPm5NADLhf6xq56p7A1Z7VmCVrkc9rvV1UCxtnuAxV' },
  { step: 'paid', hash: 'CVz6QvXk8Z62thL6Ed82aABjraBiCaCr3kmHxNuhSA45' },
] as const;

export function replyDeposit(p: Pick<PendingReply, 'amount' | 'seed'>): string {
  return (BigInt(p.amount) - BigInt(p.seed) + STORAGE_MARGIN_YOCTO).toString();
}

/** The same calls as the ordinary pages. Time travel changes the story date, never the chain clock. */
export async function startStory(client: AmplopClient, wishes: StoryWishes,
  mark: (m: StoryMark) => void, active: (s: StoryStep) => void,
  alive: () => boolean = () => true, now = () => performance.now()): Promise<StorySession> {
  async function timed<T>(step: StoryStep, call: () => Promise<Sent<T>>) {
    if (!alive()) throw new Error('story left');
    active(step);
    const start = now();
    const r = await call();
    if (!alive()) throw new Error('story left');
    mark({ step, ms: now() - start, hash: r.txHash });
    return r.value;
  }
  const siti = await timed('account', async () => ({ value: await client.createAccount('Siti'), txHash: null }));
  client.useAccount(siti);
  const budi = await timed('family', () => client.createSubAccount('Budi', rupiahToYocto(200_000).toString()));
  client.useAccount(siti);
  const wedding = await timed('wedding', () => client.openHajatan({ title: 'Siti & Andi', date: '2026-11-21', seedBps: 500, depositYocto: OPEN_DEPOSIT_YOCTO.toString() }));
  client.useAccount(budi);
  await timed('gift', () => client.give({ tokenId: wedding, message: wishes.gift, depositYocto: (rupiahToYocto(100_000) + STORAGE_MARGIN_YOCTO).toString() }));
  mark({ step: 'years', ms: 0, hash: null });
  const celebration = await timed('celebration', () => client.openHajatan({ title: 'Budi & Rina', date: '2028-11-20', seedBps: 500, depositYocto: OPEN_DEPOSIT_YOCTO.toString() }));
  client.useAccount(siti);
  active('ring');
  const [pending] = await client.pendingReplies(wedding);
  if (!pending || pending.giver !== budi || pending.to_token_id !== celebration) throw new Error('reply not ready');
  mark({ step: 'ring', ms: 0, hash: null });
  return { siti, budi, wedding, celebration, pending };
}

export async function replyStory(client: AmplopClient, session: StorySession, message: string): Promise<Sent<Entry>> {
  client.useAccount(session.siti);
  // If an earlier RPC response was lost, read the link before spending again.
  const [old] = await client.entries(session.wedding, session.pending.entry, 1);
  if (old?.replied) {
    const [entry] = await client.entries(old.replied.token_id, old.replied.entry, 1);
    if (!entry) throw new Error('reply not found');
    return { value: entry, txHash: null };
  }
  const r = await client.reciprocate({ tokenId: session.wedding, entry: session.pending.entry,
    toTokenId: session.celebration, message, depositYocto: replyDeposit(session.pending) });
  const [entry] = await client.entries(session.celebration, r.value, 1);
  if (!entry || entry.reply_to?.token_id !== session.wedding || entry.reply_to.entry !== session.pending.entry) throw new Error('reply not found');
  return { value: entry, txHash: r.txHash };
}
