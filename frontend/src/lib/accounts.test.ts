import { describe, expect, it } from 'vitest';
import { validReceiver } from './accounts';

describe('the next keeper', () => {
  it('accepts testnet named and implicit accounts and rejects mistyped or identical receivers', () => {
    expect(validReceiver('budi.testnet', 'siti.testnet')).toBe(true);
    expect(validReceiver('budi.family.testnet', 'siti.testnet')).toBe(true);
    expect(validReceiver('a'.repeat(64), 'siti.testnet')).toBe(true);
    for (const id of ['siti.testnet', 'budi.near', 'Budi.testnet', 'budi..testnet', '-budi.testnet', 'budi-.testnet', 'budi.testnet ', '', 'a'.repeat(65)]) {
      expect(validReceiver(id, 'siti.testnet'), id).toBe(false);
    }
  });
});
