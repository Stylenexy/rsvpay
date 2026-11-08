/**
 * A guest's key, saved as a small file, so a promise that runs for years survives a new phone.
 * The file is full access to one throwaway testnet account, and says so.
 */

export interface KeyFile { accountId: string; secret: string }

const KIND = 'rsvpay-key';

export function makeKeyFile(accountId: string, secret: string, contract: string): string {
  return JSON.stringify({ kind: KIND, version: 1, network: 'testnet', contract, accountId, secret,
    note: 'Full access to this test account. Keep it private. Restore it on rsvpay.vercel.app.' }, null, 2);
}

/** Refuses anything that is not a whole RSVPay key file for testnet. */
export function readKeyFile(text: string): KeyFile {
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('not a key file');
  }
  if (!value || value.kind !== KIND || value.version !== 1 || value.network !== 'testnet') throw new Error('not a key file');
  const { accountId, secret } = value;
  if (typeof accountId !== 'string' || !/^[a-z0-9]+(?:[-_.][a-z0-9]+)*\.testnet$/.test(accountId) || accountId.length > 64) throw new Error('not a key file');
  if (typeof secret !== 'string' || !/^ed25519:[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(secret)) throw new Error('not a key file');
  return { accountId, secret };
}
