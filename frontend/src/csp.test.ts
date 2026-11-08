import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Every host the app fetches from must be allowed by the Content Security Policy in vercel.json,
// or the browser blocks it while Node-based tests still pass. This happened once: history moved
// to archival RPC on 8 November and the browser refused it until the policy listed that host.
const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const FETCHERS = ['./chain/history.ts', './chain/near.ts', './hero/ch/network.ts'];

describe('content security policy', () => {
  it('allows every host the app connects to', () => {
    const headers = JSON.parse(read('../vercel.json')).headers.flatMap((h: { headers: { key: string; value: string }[] }) => h.headers);
    const csp: string = headers.find((h: { key: string }) => h.key === 'Content-Security-Policy').value;
    const connect = csp.split(';').map((s) => s.trim()).find((s) => s.startsWith('connect-src'))!.split(/\s+/);
    const hosts = new Set(FETCHERS.flatMap((f) => [...read(f).matchAll(/['"`](https:\/\/[a-z0-9.-]+)(?:\/[^'"`]*)?['"`]/g)].map((m) => m[1])));
    hosts.delete('https://testnet.nearblocks.io'); // explorer links, opened as pages, never fetched
    expect(hosts.size).toBeGreaterThan(2);
    for (const h of hosts) expect(connect, h).toContain(h);
  });
});
