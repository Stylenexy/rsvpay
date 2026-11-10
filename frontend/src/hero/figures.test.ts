import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CH_DATA, CH_UI } from './chapters.copy';

// The landing once said "12 of 12 refused" and "45 contract tests" beside figures of 14/14 and 54.
// Every sentence that repeats a figure must say the same number as the figure and the README.
describe('landing figures', () => {
  const [, attacks, tests] = CH_DATA.figures;
  const refused = attacks.split('/')[0];

  it('match in every language', () => {
    for (const [lang, ui] of Object.entries(CH_UI)) {
      expect(ui.refused, lang).toContain(refused);
      expect(ui.tests, lang).toContain(tests);
    }
  });

  it('match the README', () => {
    const readme = readFileSync(new URL('../../../README.md', import.meta.url), 'utf8');
    expect(readme).toContain(`${tests} Rust`);
    expect(readme).toContain(`${refused} live attacks`);
  });

  // The landing once listed a test that had been renamed away. Every name it shows must be a test in the contract.
  it('list only tests that exist in the contract', () => {
    const rust = readFileSync(new URL('../../../contracts/src/tests.rs', import.meta.url), 'utf8');
    for (const name of CH_DATA.tests) expect(rust, name).toContain(`fn ${name}()`);
  });
});
