import { useEffect, useRef, useState } from 'react';

// ---- hash routing ----

export type Route =
  | { name: 'beranda' }
  | { name: 'buka' }
  | { name: 'coba' }
  | { name: 'beri'; id: string }
  | { name: 'buku'; id: string }
  | { name: 'tidak-ada' };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  if (path === '') return { name: 'beranda' };
  if (path === 'buka') return { name: 'buka' };
  if (path === 'coba') return { name: 'coba' };
  const [head, rawId, ...rest] = path.split('/');
  if (rawId && rest.length === 0 && (head === 'beri' || head === 'buku')) {
    let id = rawId;
    try {
      id = decodeURIComponent(rawId);
    } catch {
      /* keep the raw id */
    }
    return { name: head, id };
  }
  return { name: 'tidak-ada' };
}

export function useRoute(): Route {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return parseHash(hash);
}

export const link = {
  beranda: () => '#/',
  buka: () => '#/buka',
  coba: () => '#/coba',
  beri: (id: string) => `#/beri/${encodeURIComponent(id)}`,
  buku: (id: string) => `#/buku/${encodeURIComponent(id)}`,
};

export function go(hash: string) {
  window.location.hash = hash;
}

/** Absolute link a person can share or scan, e.g. https://host/path/#/beri/3 */
export function absoluteLink(hash: string): string {
  return window.location.href.split('#')[0] + hash;
}

// ---- small async hooks ----

export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ loading: boolean; data?: T; error?: Error }>({ loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    load().then(
      (data) => alive && setState({ loading: false, data }),
      (error) => alive && setState({ loading: false, error: error as Error }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((n) => n + 1) };
}

/** Run `fn` every `ms` while the page is visible. */
export function usePoll(fn: () => void, ms: number, enabled = true) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') saved.current();
    }, ms);
    return () => window.clearInterval(id);
  }, [ms, enabled]);
}

/** Count a number up from its previous value (ease-out), for totals that change. */
export function useCountUp(target: number, ms = 900): number {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(target);
      from.current = target;
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    // background tabs pause animation frames: land on the real number anyway
    const settle = window.setTimeout(() => {
      setShown(target);
      from.current = target;
    }, ms + 150);
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      const v = a + (target - a) * e;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      from.current = target;
    };
  }, [target, ms]);
  return shown;
}

// ---- formatting and clipboard ----

/** Nanosecond timestamp string to a short Indonesian date. */
export function formatDate(ns: string): string {
  const ms = Number(BigInt(ns) / 1_000_000n);
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ms));
}

/** "budi-k3x9.testnet" → "Budi" (first part, capitalised), for friendly names. */
export function shortName(accountId: string): string {
  const head = accountId.split(/[.-]/)[0] || accountId;
  return head.charAt(0).toUpperCase() + head.slice(1);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
