import { KeyPair, PublicKey } from 'near-api-js';

/**
 * The holder gate. The book page opens only when this browser proves, at the moment of opening, that it holds a
 * key of the envelope's current NEP-171 owner:
 *   1. the owner is read from the chain (`nft_token`), not from the page;
 *   2. the browser's key is listed among that owner's access keys on chain (`view_access_key`);
 *   3. the key signs a fresh NEP-413 message (random nonce, this contract as recipient) and the signature checks
 *      out against the public key the chain returned.
 * A name typed into browser storage, or a key of another account, fails step 2 or 3. The data itself stays public
 * on chain, so this gate decides who sees the book and its controls, not who can read the contract.
 */

/** NEP-413 tag: 2^31 + 413, written as a little-endian u32 before the payload. */
export const NEP413_TAG = 2147484061;

export interface Nep413Message {
  message: string;
  nonce: Uint8Array; // exactly 32 bytes
  recipient: string;
  callbackUrl?: string;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}

function str(s: string): Uint8Array {
  const bytes = new TextEncoder().encode(s);
  return concat([u32(bytes.length), bytes]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Borsh serialisation of the NEP-413 payload, tag first. */
export function nep413Bytes(m: Nep413Message): Uint8Array {
  if (m.nonce.length !== 32) throw new Error('NEP-413 nonce must be 32 bytes');
  const callback = m.callbackUrl === undefined ? new Uint8Array([0]) : concat([new Uint8Array([1]), str(m.callbackUrl)]);
  return concat([u32(NEP413_TAG), str(m.message), m.nonce, str(m.recipient), callback]);
}

export async function nep413Hash(m: Nep413Message): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', nep413Bytes(m) as Uint8Array<ArrayBuffer>));
}

export async function nep413Sign(secret: string, m: Nep413Message): Promise<{ publicKey: string; signature: Uint8Array }> {
  const kp = KeyPair.fromString(secret as `ed25519:${string}`);
  const { signature } = kp.sign(await nep413Hash(m));
  return { publicKey: kp.getPublicKey().toString(), signature };
}

export async function nep413Verify(publicKey: string, m: Nep413Message, signature: Uint8Array): Promise<boolean> {
  try {
    return PublicKey.fromString(publicKey).verify(await nep413Hash(m), signature);
  } catch {
    return false;
  }
}

export function freshNonce(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export interface HolderProof {
  accountId: string;
  publicKey: string;
  /** the NEP-413 message that was signed and verified */
  message: string;
  at: number;
}
