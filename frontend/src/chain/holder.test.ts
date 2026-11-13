import { afterEach, describe, expect, it, vi } from 'vitest';
import { JsonRpcProvider, KeyPair } from 'near-api-js';
import { NEP413_TAG, freshNonce, nep413Bytes, nep413Sign, nep413Verify } from './holder';
import { DEFAULT_CONTRACT, NearAmplopClient, type KeyStore } from './near';

afterEach(() => vi.restoreAllMocks());

const msg = (nonce = freshNonce()) => ({ message: 'RSVPay: open the book of envelope 1 as siti.testnet', nonce, recipient: DEFAULT_CONTRACT });

describe('NEP-413 message signing for the holder gate', () => {
  it('serialises the payload with the NEP-413 tag first, little-endian', () => {
    const bytes = nep413Bytes(msg(new Uint8Array(32)));
    expect(new DataView(bytes.buffer).getUint32(0, true)).toBe(NEP413_TAG);
    expect(NEP413_TAG).toBe(2 ** 31 + 413);
    // callbackUrl absent: Borsh Option::None is a single 0 byte at the end
    expect(bytes[bytes.length - 1]).toBe(0);
  });

  it('verifies a signature from the right key and refuses a changed message or another key', async () => {
    const kp = KeyPair.fromRandom('ed25519');
    const m = msg();
    const signed = await nep413Sign(kp.toString(), m);
    expect(signed.publicKey).toBe(kp.getPublicKey().toString());
    expect(await nep413Verify(signed.publicKey, m, signed.signature)).toBe(true);
    expect(await nep413Verify(signed.publicKey, { ...m, message: m.message + '!' }, signed.signature)).toBe(false);
    expect(await nep413Verify(signed.publicKey, { ...m, nonce: freshNonce() }, signed.signature)).toBe(false);
    const other = KeyPair.fromRandom('ed25519').getPublicKey().toString();
    expect(await nep413Verify(other, m, signed.signature)).toBe(false);
  });
});

function setup(secret: string) {
  const keys: Record<string, string> = { 'siti.testnet': secret };
  const store: KeyStore = { keys: () => ({ ...keys }), saveKey: () => undefined, active: () => 'siti.testnet', setActive: () => undefined };
  return new NearAmplopClient(DEFAULT_CONTRACT, store);
}
const owner = (id: string) => vi.spyOn(JsonRpcProvider.prototype, 'callFunction').mockResolvedValue({ token_id: '1', owner_id: id } as never);

describe('the holder gate opens only for a key the chain lists for the current owner', () => {
  it('opens for the owner whose key is on chain', async () => {
    const kp = KeyPair.fromRandom('ed25519');
    owner('siti.testnet');
    const listed = vi.spyOn(JsonRpcProvider.prototype, 'viewAccessKey').mockResolvedValue({} as never);
    const proof = await setup(kp.toString()).proveHolder('1');
    expect(proof?.accountId).toBe('siti.testnet');
    expect(proof?.publicKey).toBe(kp.getPublicKey().toString());
    expect(listed).toHaveBeenCalledWith({ accountId: 'siti.testnet', publicKey: kp.getPublicKey().toString() });
  });

  it('stays shut when the chain says someone else holds the envelope', async () => {
    owner('budi.testnet');
    vi.spyOn(JsonRpcProvider.prototype, 'viewAccessKey').mockResolvedValue({} as never);
    expect(await setup(KeyPair.fromRandom('ed25519').toString()).proveHolder('1')).toBeNull();
  });

  it('stays shut when the key on this device is not one of the owner\'s keys', async () => {
    owner('siti.testnet');
    vi.spyOn(JsonRpcProvider.prototype, 'viewAccessKey').mockRejectedValue(new Error('access key does not exist'));
    expect(await setup(KeyPair.fromRandom('ed25519').toString()).proveHolder('1')).toBeNull();
  });

  it('stays shut when browser storage holds a name with a fake key', async () => {
    owner('siti.testnet');
    vi.spyOn(JsonRpcProvider.prototype, 'viewAccessKey').mockResolvedValue({} as never);
    expect(await setup('this-is-not-a-private-key').proveHolder('1')).toBeNull();
  });
});
