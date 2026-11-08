import { KeyPair } from 'near-api-js';
import { describe, expect, it } from 'vitest';
import { makeKeyFile, readKeyFile } from './keyfile';

const secret = KeyPair.fromRandom('ed25519').toString();

describe('a guest key file', () => {
  it('reads back what it wrote', () => {
    expect(readKeyFile(makeKeyFile('maya-abcde12.rsvpay-dana-3ddy.testnet', secret, 'rsvpay-v2.testnet'))).toEqual({ accountId: 'maya-abcde12.rsvpay-dana-3ddy.testnet', secret });
  });

  it('refuses broken or foreign files', () => {
    const good = JSON.parse(makeKeyFile('maya.testnet', secret, 'rsvpay-v2.testnet'));
    expect(() => readKeyFile('{not json')).toThrow('not a key file');
    expect(() => readKeyFile(JSON.stringify({ ...good, kind: 'wallet' }))).toThrow('not a key file');
    expect(() => readKeyFile(JSON.stringify({ ...good, network: 'mainnet' }))).toThrow('not a key file');
    expect(() => readKeyFile(JSON.stringify({ ...good, accountId: 'Maya.testnet' }))).toThrow('not a key file');
    expect(() => readKeyFile(JSON.stringify({ ...good, secret: 'ed25519:short' }))).toThrow('not a key file');
  });
});
