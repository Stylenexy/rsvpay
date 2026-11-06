import { titleLines } from '../lib/names';
import { link } from '../lib/app';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { gsap } from 'gsap';
import { useCopy } from '../copy';
import { useAmplop } from '../context';
import { useFormat, useLang } from '../lib/lang';
import { useLangPill } from '../lib/pill';
import { LANGS } from '../hero/copy';

// ---- sky: photography + ambient stars + film grain ----

export type Langit = 'fajar' | 'senja' | 'malam';

/** seeded random so the same sky is drawn on every visit */
export function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** one element, many stars: a box-shadow list (cheap to paint, easy to rotate or dim) */
export function starShadow(n: number, w: number, h: number, seed: number, size: [number, number] = [0.3, 1], color?: string): string {
  const r = rng(seed);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = Math.round(r() * w);
    const y = Math.round(r() * h);
    const s = (size[0] + r() * (size[1] - size[0])).toFixed(2);
    const o = (0.3 + r() * 0.6).toFixed(2);
    out.push(`${x}px ${y}px 0 ${s}px ${color ?? `color-mix(in srgb, var(--star) ${Math.round(+o * 100)}%, transparent)`}`);
  }
  return out.join(',');
}

export function Sky({ langit }: { langit: Langit }) {
  useEffect(() => {
    document.documentElement.dataset.langit = langit;
  }, [langit]);
  const amb = useMemo(() => starShadow(70, 480, 560, 3, [0.2, 0.8]), []);
  return (
    <div className="sky" aria-hidden="true">
      <img className="sky-photo sky-morning" src="/aset/v2/fajar.webp" alt="" />
      <img className="sky-photo sky-dusk" src="/langit/hd/120.webp" alt="" />
      <img className="sky-photo sky-evening" src="/aset/v2/antariksa.webp" alt="" />
      <i className="sky-amb" style={{ boxShadow: amb }} />
      <i className="sky-night" />
    </div>
  );
}

// ---- the small physical envelope in a card corner (the "real object" of the senior look) ----

export function EnvelopeObject({ className = '' }: { className?: string }) {
  return <img className={`obj ${className}`} src="/aset/v2/kaca.webp" alt="" aria-hidden="true" />;
}

export function EnvelopeStory({ title, date, children, amount = 250000, plain = false }: {
  title: string; date?: string; children: ReactNode; amount?: number; plain?: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  const { date: formatDate } = useFormat();
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => {
        gsap.from('.title-rise', { yPercent: 110, rotate: 2, stagger: 0.12, duration: 1.15, ease: 'power3.out', clearProps: 'transform' });
        gsap.to('.envelope-float', { y: -14, rotate: 1.5, duration: 4.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      }, root);
      return () => ctx.revert();
    });
    return () => media.revert();
  }, []);
  return (
    <section className="envelope-story" ref={root} style={{ '--gift-glow': Math.min(1, 0.25 + amount / 1200000) } as CSSProperties}>
      <h1>{titleLines(title).map(({ text, connector }, i) => (
        <span className={`title-mask${connector ? ' title-connector' : ''}`} key={i}><span className="title-rise">{connector ? <em>{text}</em> : text}</span></span>
      ))}</h1>
      {date && <p className="story-date">{formatDate(date)}</p>}
      {!plain && <div className="envelope-stage" aria-hidden="true"><div className="envelope-halo" /><img className="envelope-float" src="/aset/v2/kaca.webp" alt="" /></div>}
      <p className="story-line">{children}</p>
    </section>
  );
}

/** While an envelope is read from the chain. */
export function Loading() {
  const t = useCopy();
  return <div className="page-state" role="status"><img src="/aset/v2/kaca.webp" alt="" /><p>{t.loading}</p></div>;
}

/** A link that leads nowhere still offers a way forward. */
export function Missing() {
  const t = useCopy();
  return (
    <main className="page-state">
      <img src="/aset/v2/kaca.webp" alt="" />
      <h1>{t.missing}</h1>
      <p>{t.missingHint}</p>
      <div className="row"><a className="btn" href={link.buka()}>{t.bukuMake}</a><a className="btn ghost" href={link.coba()}>{t.cobaStart}</a></div>
      <a className="text-link" href={link.beranda()}>{t.notFoundBack} ↗</a>
    </main>
  );
}

// ---- money: each changed digit travels through its own window ----

export function Rp({ value, className = '', animate = true }: { value: number; className?: string; animate?: boolean }) {
  const { currency, formatRpDigits, formatRp } = useFormat();
  const text = formatRpDigits(value);
  const previous = useRef(text);
  const root = useRef<HTMLElement>(null);
  const before = previous.current.padStart(text.length, ' ').slice(-text.length);
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    if (animate) media.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => {
        gsap.fromTo('.roll-track', { yPercent: 0 }, { yPercent: -50, stagger: 0.035, duration: 0.6, ease: 'power3.inOut' });
      }, root);
      return () => ctx.revert();
    });
    previous.current = text;
    return () => media.revert();
  }, [text, animate]);
  return (
    <b ref={root} className={`rp ${className}`} aria-label={formatRp(value)}>
      <i className="cur" aria-hidden="true">{currency}</i>
      <span className="digits" aria-hidden="true">{[...text].map((char, i) => (
        <span className="digit" key={`${text}-${i}`}>{animate && /\d/.test(char) && before[i] !== char
          ? <span className="roll-track"><span>{before[i]}</span><span>{char}</span></span> : char}</span>
      ))}</span>
    </b>
  );
}

// ---- segmented control ----

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---- slide to give (a tap on the knob also works) ----

export function SlideToGive({ label, disabled, done, onGive }: { label: string; disabled?: boolean; done?: boolean; onGive: () => void }) {
  const t = useCopy();
  const knob = useRef<HTMLButtonElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x0: number; moved: number } | null>(null);
  const max = () => (track.current ? track.current.clientWidth - 58 : 200);
  const end = done ? max() : dx;
  useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (drag.current || reduced) gsap.set(knob.current, { x: end });
    else gsap.to(knob.current, { x: end, duration: 0.8, ease: 'elastic.out(1, 0.45)', overwrite: true });
    return () => { gsap.killTweensOf(knob.current); };
  }, [end]);
  return (
    <div className={`slide glass${disabled ? ' off' : ''}`} ref={track}>
      <button
        type="button"
        className="knob"
        ref={knob}
        onClick={(e) => { if (e.detail === 0 && !disabled) onGive(); }}
        onPointerCancel={() => { drag.current = null; setDx(0); }}
        aria-label={label}
        disabled={disabled}
        onPointerDown={(e) => {
          if (disabled) return;
          drag.current = { x0: e.clientX, moved: 0 };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const m = Math.max(0, Math.min(max(), e.clientX - drag.current.x0));
          drag.current.moved = m;
          setDx(m);
        }}
        onPointerUp={() => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          if (d.moved > max() * 0.72 || d.moved < 3) onGive();
          setDx(0);
        }}
      />
      <span>{label}</span>
      <small className="slide-hint">{t.beriTap}</small>
    </div>
  );
}

// ---- small pieces ----

export function Glass({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`glass ${className}`}>{children}</div>;
}

export function AccountChip() {
  const t = useCopy();
  const { client, account, switchTo } = useAmplop();
  const all = client.accounts();
  return (
    <div className="acct">
      <span className="tok">{account ? `${t.akunLabel} ${account}` : t.akunNone}</span>
      {all.length > 1 && (
        <select aria-label={t.akunSwitch} value={account ?? ''} onChange={(e) => switchTo(e.target.value)}>
          {all.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export function TxLink({ hash }: { hash: string | null }) {
  const t = useCopy();
  const { client } = useAmplop();
  if (!hash || !client.explorerTx(hash)) return null;
  return (
    <a className="txlink" href={client.explorerTx(hash)} target="_blank" rel="noreferrer">
      {t.beriProof} · <code>{hash.slice(0, 8)}…</code>
    </a>
  );
}

export function Qr({ text, size = 168 }: { text: string; size?: number }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let alive = true;
    const css = getComputedStyle(document.documentElement);
    const dark = css.getPropertyValue('--qr-dark').trim();
    const light = css.getPropertyValue('--qr-light').trim();
    QRCode.toString(text, { type: 'svg', margin: 1, color: { dark, light } }).then((s) => alive && setSvg(s));
    return () => {
      alive = false;
    };
  }, [text]);
  return <div className="qr" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const t = useCopy();
  const pill = useLangPill<HTMLDivElement>(lang);
  return <div className="app-languages" role="group" aria-label={t.language} ref={pill}>
    <i className="lang-pill" aria-hidden="true" />
    {LANGS.map((l) => <button type="button" key={l.id} lang={l.id} aria-label={l.name} title={l.name} aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>{l.label}</button>)}
  </div>;
}
