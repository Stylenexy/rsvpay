import { useEffect, useSyncExternalStore } from 'react';
import { LANGS, type Lang } from '../hero/copy';
import { currency, formatRp as rupiah, formatRpDigits as digits, shortRp as compact } from './rupiah';

export const LOCALES: Record<Lang, string> = {
  en: 'en-US', id: 'id-ID', zh: 'zh-CN', ko: 'ko-KR', ja: 'ja-JP', vi: 'vi-VN',
};
const KEY = 'amplop-lang';
const EVENT = 'amplop-language';
let fallback: Lang = 'en';

export function readLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    return LANGS.some((l) => l.id === saved) ? saved as Lang : fallback;
  } catch {
    return fallback;
  }
}

export function setLang(lang: Lang) {
  fallback = lang;
  try { localStorage.setItem(KEY, lang); } catch { /* private browsing */ }
  window.dispatchEvent(new Event(EVENT));
}

/** The landing sets html.lang after saving; observe it without changing its owner’s code. */
function subscribe(update: () => void) {
  window.addEventListener('storage', update);
  window.addEventListener(EVENT, update);
  window.addEventListener('hashchange', update);
  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  return () => {
    window.removeEventListener('storage', update);
    window.removeEventListener(EVENT, update);
    window.removeEventListener('hashchange', update);
    observer.disconnect();
  };
}

export function useLang() {
  const lang = useSyncExternalStore(subscribe, readLang, () => 'en' as Lang);
  useEffect(() => {
    if (document.documentElement.lang !== lang) document.documentElement.lang = lang;
  }, [lang]);
  return { lang, setLang, locale: LOCALES[lang] };
}

/** Normalize the Indonesian date sentences already stored by the demo, without guessing free text. */
export function celebrationISO(value: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const old = /^(?:(?:Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu),?\s+)?(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})$/i.exec(value.trim());
  if (!old) return null;
  const months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
  return `${old[3]}-${String(months.indexOf(old[2].toLowerCase()) + 1).padStart(2, '0')}-${old[1].padStart(2, '0')}`;
}

export function formatCelebrationDate(value: string, locale: string): string {
  const iso = celebrationISO(value);
  if (!iso) return value;
  const day = new Date(iso + 'T12:00:00Z');
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== iso) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(day);
}

export function useFormat() {
  const { locale } = useLang();
  return {
    currency: currency(locale),
    formatRp: (n: number) => rupiah(n, locale),
    formatRpDigits: (n: number) => digits(n, locale),
    shortRp: (n: number) => compact(n, locale),
    number: (n: number) => new Intl.NumberFormat(locale).format(n),
    percent: (n: number) => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(n),
    date: (value: string) => formatCelebrationDate(value, locale),
  };
}
