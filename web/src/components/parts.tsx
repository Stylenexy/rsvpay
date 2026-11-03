import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { t } from '../copy';
import { useAmplop } from '../context';
import { formatRpDigits } from '../lib/rupiah';

// ---- sky: living gradient + ambient stars + film grain ----

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
      <div className="sky-rot">
        <i className="b1" />
        <i className="b2" />
        <i className="b3" />
      </div>
      <i className="sky-amb" style={{ boxShadow: amb }} />
      <i className="sky-night" />
    </div>
  );
}

// ---- the small physical envelope in a card corner (the "real object" of the senior look) ----

export function EnvelopeObject({ className = '' }: { className?: string }) {
  return (
    <i className={`obj ${className}`} aria-hidden="true">
      <i />
    </i>
  );
}

// ---- money: "Rp" small and dim, digits large ----

export function Rp({ value, className = '' }: { value: number; className?: string }) {
  return (
    <b className={`rp ${className}`}>
      <i className="cur">Rp</i>
      {formatRpDigits(value)}
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
  const track = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x0: number; moved: number } | null>(null);
  const max = () => (track.current ? track.current.clientWidth - 58 : 200);
  const end = done ? max() : dx;
  return (
    <div className={`slide glass${disabled ? ' off' : ''}`} ref={track}>
      <button
        type="button"
        className="knob"
        aria-label={label}
        disabled={disabled}
        style={{ transform: `translateX(${end}px)`, transition: drag.current ? 'none' : undefined }}
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
    </div>
  );
}

// ---- small pieces ----

export function Glass({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`glass ${className}`}>{children}</div>;
}

export function AccountChip() {
  const { client, account, switchTo } = useAmplop();
  const all = client.accounts();
  return (
    <div className="acct">
      <span className="tok">{account ? `${t.akun.label} ${account}` : t.akun.none}</span>
      {all.length > 1 && (
        <select aria-label={t.akun.switch} value={account ?? ''} onChange={(e) => switchTo(e.target.value)}>
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
  const { client } = useAmplop();
  if (!hash || !client.explorerTx(hash)) return null;
  return (
    <a className="txlink" href={client.explorerTx(hash)} target="_blank" rel="noreferrer">
      {t.beri.proof} · <code>{hash.slice(0, 8)}…</code>
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
