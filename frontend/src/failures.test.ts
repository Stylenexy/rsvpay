import { describe, expect, it } from 'vitest';
import { MockAmplopClient, MOCK_ENTRY_COST } from './chain/mock';
import { slug } from './chain/near';
import { AMPLOP_ERRORS } from './chain/types';
import { plainError } from './copy';
import { parseHash } from './lib/app';
import { rupiahToYocto, STORAGE_MARGIN_YOCTO } from './lib/rupiah';

const NEAR = 10n ** 24n;

describe('what a person sees when something fails', () => {
  it('turns every contract refusal a guest or host can hit into plain Indonesian', () => {
    const real = (text: string) => `Smart contract panicked: ${text}`;
    expect(plainError(new Error(real('this hajatan is not accepting gifts')), 'id')).toMatch(/tidak menerima pemberian/);
    expect(plainError(new Error(real('only the current holder of the amplop can do this')), 'id')).toMatch(/pemegang/);
    expect(plainError(new Error(real('this gift was already replied to')), 'id')).toMatch(/sudah dibalas/);
    expect(plainError(new Error(real('nothing to withdraw')), 'id')).toMatch(/dana bebas/);
    expect(plainError(new Error(real('amplop is mid-transfer, try after it settles')), 'id')).toMatch(/berpindah tangan/);
  });

  it('explains a rate-limited account helper instead of failing silently', () => {
    expect(plainError(new Error('helper 429: too many requests'), 'id')).toMatch(/dibatasi/);
  });

  it('never shows raw technical text for an unknown failure', () => {
    const shown = plainError(new Error('wasm trap: StackOverflow at 0xdeadbeef'), 'id');
    expect(shown).toBe('Ada yang gagal. Coba lagi.');
  });

  it('keeps every error key in step with the contract texts', () => {
    expect(Object.values(AMPLOP_ERRORS).every((v) => v.length > 0)).toBe(true);
  });
});

describe('money the guest sends', () => {
  it('always covers the storage of the entry, so the smallest gift still lands', async () => {
    const c = new MockAmplopClient();
    await c.createAccount('Siti');
    const { value: id } = await c.openHajatan({ title: 'A', date: 'B', seedBps: 500, depositYocto: (NEAR / 20n).toString() });
    expect(STORAGE_MARGIN_YOCTO).toBeGreaterThan(MOCK_ENTRY_COST);
    await c.createAccount('Budi');
    const smallest = rupiahToYocto(100_000) + STORAGE_MARGIN_YOCTO;
    await c.give({ tokenId: id, message: 'x', depositYocto: smallest.toString() });
    const [e] = await c.entries(id);
    expect(BigInt(e.amount)).toBeGreaterThanOrEqual(rupiahToYocto(100_000));
  });

  it('refuses a gift bigger than the account holds without touching the amplop', async () => {
    const c = new MockAmplopClient();
    await c.createAccount('Siti');
    const { value: id } = await c.openHajatan({ title: 'A', date: 'B', seedBps: 500, depositYocto: (NEAR / 20n).toString() });
    await expect(c.give({ tokenId: id, message: 'x', depositYocto: (NEAR * 11n).toString() })).rejects.toThrow('not enough balance');
    expect((await c.hajatan(id))!.entries).toBe(0);
  });
});

describe('names and links from strangers', () => {
  it('makes a valid account name from any typed name', () => {
    expect(slug('Budi Santoso')).toBe('budisantoso');
    expect(slug('Rína & kel.')).toBe('rinakel');
    expect(slug('!!!')).toBe('tamu');
    expect(slug('😀')).toBe('tamu');
    expect(slug('a'.repeat(40))).toHaveLength(14);
  });

  it('sends broken links to the not-found page', () => {
    expect(parseHash('#/beri').name).toBe('tidak-ada');
    expect(parseHash('#/buku/1/extra').name).toBe('tidak-ada');
    expect(parseHash('#/apa')).toEqual({ name: 'tidak-ada' });
    expect(parseHash('#/beri/%E0%A4%A')).toEqual({ name: 'beri', id: '%E0%A4%A' });
  });
});
