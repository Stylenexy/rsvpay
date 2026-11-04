import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('.', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(SRC).filter((f) => /\.(css|tsx?)$/.test(f) && !f.endsWith('.test.ts'));

describe('theme and copy hygiene', () => {
  it('has literal colors only in theme.css', () => {
    const literal = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;
    const offenders = files.filter((f) => !f.endsWith('theme.css') && literal.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('keeps long dashes and technical words out of on-screen copy', () => {
    const copy = readFileSync(join(SRC, 'copy.ts'), 'utf8');
    expect(copy).not.toMatch(/[–—]/);
    // user-facing strings only: the import line and error map keys are code
    const strings = [...copy.matchAll(/(['`])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2]).join('\n');
    for (const word of ['NFT', 'kontrak', 'gas', 'blockchain', 'yocto', 'relayer', 'wallet', 'token']) {
      expect(strings.toLowerCase().split(/\W+/)).not.toContain(word.toLowerCase());
    }
  });
});
