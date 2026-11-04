import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadEnvelopeHistory, mergeHistory, parseHistoryEvents, rememberHistoryTransaction } from './history';
import { MockAmplopClient } from './mock';
import { DEFAULT_CONTRACT } from './near';

const C = DEFAULT_CONTRACT;
function evidence(logs: string[], status: Record<string, unknown> = { SuccessValue: '' }, executor = C) {
  return { transaction: { hash: 'receipt-hash', receiver_id: C, signer_id: 'siti.testnet' }, receipts_outcome: [{ outcome: { executor_id: executor, logs, status } }] };
}
afterEach(() => vi.unstubAllGlobals());

describe('history from successful execution events', () => {
  it('reads the actual payout callback obtained with a read-only testnet RPC query', () => {
    const fixture = JSON.parse(readFileSync(new URL('./fixtures/withdraw.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
    const events = parseHistoryEvents('5', C, fixture, null);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: 'paid', amount: '993607000000000000000000', hash: 'CVz6QvXk8Z62thL6Ed82aABjraBiCaCr3kmHxNuhSA45' });
    expect(parseHistoryEvents('6', C, fixture, null)).toEqual([]);
  });

  it('never counts an attempted or refunded withdrawal as paid', () => {
    const logs = ['amplop:withdraw token=1 holder=siti.testnet yocto=100', 'amplop:payout_failed_refunded token=1 yocto=100'];
    expect(parseHistoryEvents('1', C, evidence(logs), null).map((e) => e.kind)).toEqual(['refund']);
    expect(parseHistoryEvents('1', C, evidence(['amplop:paid token=1 yocto=100'], { Failure: {} }), null)).toEqual([]);
    expect(parseHistoryEvents('1', C, evidence(['amplop:paid token=1 yocto=100'], { SuccessValue: '' }, 'stranger.testnet'), null)).toEqual([]);
  });

  it('reads only matching transfers and both sides of a reply', () => {
    const tx = evidence([
      'EVENT_JSON:' + JSON.stringify({ standard: 'nep171', event: 'nft_transfer', data: [{ old_owner_id: 'siti.testnet', new_owner_id: 'budi.testnet', token_ids: ['1'] }] }),
      'amplop:reply from=1 entry=3 to=2 to_entry=0 yocto=750',
    ]);
    expect(parseHistoryEvents('1', C, tx, '100')).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'holder', from: 'siti.testnet', to: 'budi.testnet' }),
      expect.objectContaining({ id: 'out:3', kind: 'replyOut', amount: '750', peer: '2' }),
    ]));
    expect(parseHistoryEvents('2', C, tx, '100')).toEqual([expect.objectContaining({ id: 'in:0', kind: 'replyIn', peer: '1' })]);
    expect(parseHistoryEvents('3', C, tx, '100')).toEqual([]);
  });

  it('deduplicates entries, keeps their known time, and sorts large timestamps exactly', () => {
    const base = { id: 'in:0', kind: 'gift' as const, at: '1793000000000000000', hash: null, amount: '100' };
    const events = mergeHistory([base], [{ ...base, hash: 'real-hash', at: null }, { ...base, id: 'in:1', at: '1793000000000000001' }]);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ hash: 'real-hash', at: base.at });
  });

  it('keeps payout totals unknown when the public index is empty; still shows chain gifts and replies', async () => {
    const c = new MockAmplopClient();
    const siti = await c.createAccount('Siti');
    const a = await c.openHajatan({ title: 'A', date: '', seedBps: 500, depositYocto: (10n ** 23n).toString() });
    await c.createAccount('Budi');
    await c.give({ tokenId: a.value, message: '', depositYocto: (10n ** 23n).toString() });
    const b = await c.openHajatan({ title: 'B', date: '', seedBps: 500, depositYocto: (10n ** 23n).toString() });
    c.useAccount(siti);
    await c.reciprocate({ tokenId: a.value, entry: 0, toTokenId: b.value, message: '', depositYocto: (10n ** 23n).toString() });
    Object.defineProperty(c, 'mode', { value: 'testnet' });
    const request = vi.fn(async () => new Response(JSON.stringify({ txns: [] })));
    vi.stubGlobal('fetch', request);
    const history = await loadEnvelopeHistory(c, (await c.hajatan(a.value))!);
    expect(history.coverage).toBe('unavailable');
    expect(history.paid).toBeNull();
    expect(history.events.map((e) => e.kind)).toEqual(['gift', 'replyOut']);
    expect(history.earned).toBe((await c.entries(a.value))[0].amount);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('stores public references only and confirms locally signed payouts even if the indexer fails', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) });
    const tx = evidence(['amplop:paid token=1 yocto=100']);
    rememberHistoryTransaction(C, { ...tx, secret: 'never store this' });
    expect([...values.values()].join('')).not.toContain('never store this');
    const c = new MockAmplopClient();
    await c.createAccount('Siti');
    const a = await c.openHajatan({ title: 'A', date: '', seedBps: 500, depositYocto: (10n ** 23n).toString() });
    Object.defineProperties(c, { mode: { value: 'testnet' }, contractId: { value: C } });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const result = await loadEnvelopeHistory(c, (await c.hajatan(a.value))!);
    expect(result.coverage).toBe('partial');
    expect(result.paid).toBe('100');
    expect(result.events[0]).toMatchObject({ kind: 'paid', hash: 'receipt-hash' });
  });
});
