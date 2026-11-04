import { afterEach, describe, expect, it, vi } from 'vitest';
import { CH_DATA } from '../chapters.copy';
import { askNetwork } from './network';

const block = { block_height: 120034, block_hash: 'finalized-block' };
const response = (result: unknown) => ({ ok: true, json: async () => ({ result }) });
afterEach(() => vi.unstubAllGlobals());

describe('the visitor’s live network receipt', () => {
  it('reads keys and code at the same finalized block, using the visitor’s signal', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ ...block, keys: [] })).mockResolvedValueOnce(response({ ...block, code_hash: CH_DATA.hash }));
    vi.stubGlobal('fetch', fetch);
    const signal = new AbortController().signal;
    const receipt = await askNetwork(signal);
    expect(receipt).toMatchObject({ keys: 0, hash: CH_DATA.hash, block: block.block_height, blockHash: block.block_hash, matches: true });
    expect(receipt.milliseconds).toBeGreaterThanOrEqual(0);
    expect(fetch.mock.calls[0][0]).toBe('https://test.rpc.fastnear.com');
    const requests = fetch.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(requests[0].params).toEqual({ request_type: 'view_access_key_list', account_id: CH_DATA.account, finality: 'final' });
    expect(requests[1].params).toEqual({ request_type: 'view_account', account_id: CH_DATA.account, block_id: block.block_hash });
    expect(fetch.mock.calls.every(([, init]) => init.signal === signal)).toBe(true);
  });
  it('prints an unexpected value faithfully instead of replacing it with the published record', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ ...block, keys: [{ public_key: 'unexpected-key' }] })).mockResolvedValueOnce(response({ ...block, code_hash: 'different-code' })));
    expect(await askNetwork(new AbortController().signal)).toMatchObject({ keys: 1, hash: 'different-code', matches: false });
  });
  it('rejects an RPC error without producing a receipt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ error: { message: 'unavailable' } }) }));
    await expect(askNetwork(new AbortController().signal)).rejects.toThrow('Invalid RPC response');
  });
  it('rejects malformed values and inconsistent blocks', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ ...block, keys: null }));
    vi.stubGlobal('fetch', fetch);
    await expect(askNetwork(new AbortController().signal)).rejects.toThrow('Missing access key list');
    fetch.mockResolvedValueOnce(response({ ...block, keys: [] })).mockResolvedValueOnce(response({ ...block, block_height: block.block_height + 1, code_hash: CH_DATA.hash }));
    await expect(askNetwork(new AbortController().signal)).rejects.toThrow('Invalid account response');
  });
  it.each([null, [], { result: null }, { result: { ...block, block_height: '120034', keys: [] } }])('rejects a malformed RPC envelope: %j', async body => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => body }));
    await expect(askNetwork(new AbortController().signal)).rejects.toThrow('Invalid RPC response');
  });
  it('propagates HTTP and cancellation failures instead of showing a successful answer', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 503 });
    vi.stubGlobal('fetch', fetch);
    await expect(askNetwork(new AbortController().signal)).rejects.toThrow('HTTP 503');
    fetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));
    await expect(askNetwork(new AbortController().signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});
