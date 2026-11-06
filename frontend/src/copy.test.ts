import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPY, plainError, say } from './copy';
import { LANGS } from './hero/copy';
import { formatCelebrationDate, LOCALES, readLang } from './lib/lang';
import { formatRp, shortRp } from './lib/rupiah';

afterEach(() => vi.unstubAllGlobals());

describe('the shared language of the envelope', () => {
  it('defaults to English and reads all six landing preferences', () => {
    vi.stubGlobal('localStorage', { getItem: () => null });
    expect(readLang()).toBe('en');
    for (const { id } of LANGS) {
      vi.stubGlobal('localStorage', { getItem: () => id });
      expect(readLang()).toBe(id);
    }
    vi.stubGlobal('localStorage', { getItem: () => 'invalid' });
    expect(readLang()).toBe('en');
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('unavailable'); } });
    expect(readLang()).toBe('en');
  });

  it('has real words and matching substitutions in every language', () => {
    for (const { id } of LANGS) {
      for (const key of Object.keys(COPY.en) as (keyof typeof COPY.en)[]) {
        const text = COPY[id][key];
        expect(text.trim(), `${id}.${key}`).not.toBe('');
        expect(text, `${id}.${key}`).not.toMatch(/\?{2}|[–—]/);
        expect([...new Set(text.match(/\{\d+\}/g) ?? [])].sort()).toEqual([...new Set(COPY.en[key].match(/\{\d+\}/g) ?? [])].sort());
        for (const word of ['wallet', 'token', 'contract', 'blockchain', 'benih']) {
          expect(text.toLowerCase().split(/\W+/)).not.toContain(word);
        }
        if (key !== 'appName' && id !== 'id') expect(text.toLowerCase()).not.toContain('amplop');
      }
      expect(say(COPY[id].bukuSky, 'Siti', '2')).not.toMatch(/\{\d+\}/);
    }
  });

  it('shows rupiah in Indonesian and play dollars everywhere else', () => {
    for (const { id } of LANGS) {
      expect(formatRp(250000, LOCALES[id])).toBe(id === 'id' ? 'Rp250.000' : '$250');
      expect(shortRp(1000000, LOCALES[id])).not.toBe('');
    }
    expect(formatRp(250000, 'en-US')).toBe('$250');
    expect(formatRp(250000, 'id-ID')).toBe('Rp250.000');
    expect(plainError(new Error('unknown'))).toBe(COPY.en.errUnknown);
    expect(formatCelebrationDate('2026-11-21', 'en-US')).toBe('November 21, 2026');
    expect(formatCelebrationDate('2026-11-21', 'id-ID')).toBe('21 November 2026');
    for (const { id } of LANGS) {
      expect(formatCelebrationDate('Sabtu, 21 November 2026', LOCALES[id])).toBe(formatCelebrationDate('2026-11-21', LOCALES[id]));
      expect(formatCelebrationDate('Rabu, 1 Januari 2025', LOCALES[id])).toBe(formatCelebrationDate('2025-01-01', LOCALES[id]));
    }
    expect(formatCelebrationDate('31 Februari 2026', 'en-US')).toBe('31 Februari 2026');
    expect(formatCelebrationDate('2026-11-40', 'en-US')).toBe('2026-11-40');
    expect(formatCelebrationDate('Saturday with our families', 'en-US')).toBe('Saturday with our families');
  });
});
