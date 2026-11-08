import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The site serves its own copy of the threat model (frontend/public/threat-model.md, linked from the
// landing). It once went stale and still described the 300-block lock that issue #7 removed.
// The copy must equal docs/THREAT-MODEL.md, with links that point into the repo instead of next to it.
const REPO = 'https://github.com/Stylenexy/rsvpay/blob/master/docs/';
const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

export const forTheSite = (source: string) => source.replace(/\]\((?!https?:)([^)]+)\)/g, (_, path: string) => `](${REPO}${path})`);

describe('threat model served by the site', () => {
  it('is the same as the one in docs', () => {
    expect(read('../public/threat-model.md')).toBe(forTheSite(read('../../docs/THREAT-MODEL.md')));
  });
});
