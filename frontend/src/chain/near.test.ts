import { afterEach, describe, expect, it, vi } from 'vitest';
import { Account, JsonRpcProvider, KeyPair } from 'near-api-js';
import { DEFAULT_CONTRACT, NearAmplopClient, type KeyStore } from './near';

afterEach(() => vi.restoreAllMocks());
function setup() {
  const keys: Record<string, string> = { 'siti.testnet': KeyPair.fromRandom('ed25519').toString() };
  let active = 'siti.testnet';
  const store: KeyStore = { keys: () => ({ ...keys }), saveKey: (id, key) => { keys[id] = key; }, active: () => active, setActive: (id) => { active = id; } };
  return { client: new NearAmplopClient(DEFAULT_CONTRACT, store), store };
}

describe('the real SDK call boundaries, without sending transactions', () => {
  it('creates the child as the current parent, using its own funds and a fresh local key', async () => {
    const { client, store } = setup();
    const make = vi.spyOn(Account.prototype, 'signAndSendTransaction').mockImplementation(async function (this: Account, args) {
      expect(this.accountId).toBe('siti.testnet');
      expect(args.receiverId.endsWith('.siti.testnet')).toBe(true);
      expect(args.waitUntil).toBe('FINAL');
      expect(args.actions.map((a) => a.enum)).toEqual(['createAccount', 'transfer', 'addKey']);
      expect(args.actions[1].transfer?.deposit).toBe(400000000000000000000000n);
      expect(store.keys()[args.receiverId]).toBeDefined();
      return { status: { SuccessValue: '' }, transaction: { hash: 'child-receipt' } } as Awaited<ReturnType<Account['signAndSendTransaction']>>;
    });
    const result = await client.createSubAccount('Budi', '400000000000000000000000');
    expect(make).toHaveBeenCalledTimes(1);
    expect(result.txHash).toBe('child-receipt');
    expect(client.account()).toBe(result.value);
    expect(client.accounts()).toHaveLength(2);
  });

  it('checks that the recipient exists, then calls nft_transfer with exactly one yoctoNEAR', async () => {
    const { client } = setup();
    const exists = vi.spyOn(JsonRpcProvider.prototype, 'viewAccount').mockResolvedValue({ amount: 0n, locked: 0n, code_hash: '', storage_usage: 0, block_hash: '', block_height: 0 });
    const send = vi.spyOn(Account.prototype, 'callFunctionRaw').mockResolvedValue({ status: { SuccessValue: '' }, transaction: { hash: 'transfer-receipt' } } as Awaited<ReturnType<Account['callFunctionRaw']>>);
    const result = await client.transfer('14', 'budi.testnet');
    expect(exists).toHaveBeenCalledWith({ accountId: 'budi.testnet' });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ contractId: DEFAULT_CONTRACT, methodName: 'nft_transfer', args: { token_id: '14', receiver_id: 'budi.testnet' }, deposit: 1n, waitUntil: 'FINAL' }));
    expect(result).toEqual({ value: null, txHash: 'transfer-receipt' });
  });

  it('does not transfer into a missing account or select another deployment', async () => {
    const { client } = setup();
    vi.spyOn(JsonRpcProvider.prototype, 'viewAccount').mockRejectedValue(new Error('unknown account'));
    const send = vi.spyOn(Account.prototype, 'callFunctionRaw');
    await expect(client.transfer('14', 'missing.testnet')).rejects.toThrow('unknown account');
    expect(send).not.toHaveBeenCalled();
    expect(() => new NearAmplopClient('different.testnet')).toThrow('fixed testnet');
  });
});
