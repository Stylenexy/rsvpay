import { useEffect, useRef, useState } from 'react';
import { link } from '../lib/app';
import { CHAPTERS } from './chapters.copy';
import { mountChapters } from './chapters.motion';
import { Logo } from './Logo';
import { HERO, WORDS, type Lang } from './copy';
import './chapters.css';

const DEMO: string = import.meta.env.VITE_DEMO_TOKEN ?? '14';
const CONTRACT = 'https://testnet.nearblocks.io/address/amplop-c-mvznhnlx.testnet';
const IMG = (n: string) => `${import.meta.env.BASE_URL}aset/${n}`;
const PANELS = ['qr.webp', 'gedung.webp', 'kaca-miring.webp', 'malam.webp'];
const FIGURES = ['0', '12/12', '45', '10%'];
const YEARS = ['2026', '2028', '2031'];
const HOLD = 6500;

/** Small line in the corners of a chapter, the way a book numbers its pages. */
function Corner({ n, text }: { n: string; text: string }) {
  return (
    <header className="ch-corner">
      <span>{text}</span>
      <span className="ch-no">{n}</span>
    </header>
  );
}

function Panels({ lang }: { lang: Lang }) {
  const c = CHAPTERS[lang].table;
  const h = HERO[lang];
  const [on, setOn] = useState(0);
  const [held, setHeld] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.35 });
    io.observe(row.current!);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!seen || held || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => setOn((v) => (v + 1) % c.panels.length), HOLD);
    return () => window.clearTimeout(t);
  }, [on, seen, held, c.panels.length]);

  return (
    <div className="cp-row" ref={row} onMouseLeave={() => setHeld(false)}>
      {c.panels.map((p, i) => (
        <button
          type="button"
          key={i}
          className={i === on ? 'cp on' : 'cp'}
          aria-expanded={i === on}
          onClick={() => setOn(i)}
          onMouseEnter={() => {
            setOn(i);
            setHeld(true);
          }}
        >
          <img src={IMG(PANELS[i])} alt="" loading="lazy" />
          <span className="cp-no">{i + 1}</span>
          {i === 2 && (
            <span className="cp-split">
              <b>Rp{(95000).toLocaleString(h.locale)}</b>
              {h.forSiti}
              <b className="kept">Rp{(5000).toLocaleString(h.locale)}</b>
              {h.kept}
            </span>
          )}
          <span className="cp-text">
            <strong>{p.t}</strong>
            <span>{p.d}</span>
          </span>
          {i === on && seen && !held && <i className="cp-load" />}
        </button>
      ))}
    </div>
  );
}

export function Chapters({ lang }: { lang: Lang }) {
  const c = CHAPTERS[lang];
  const h = HERO[lang];
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => mountChapters(box.current!), []);

  return (
    <div className="ch" ref={box}>
      <section className="ch-table">
        <Corner n="02" text={c.table.kicker} />
        <h2 className="ch-big" data-wipe>
          {c.table.big}
        </h2>
        <Panels lang={lang} />
      </section>

      <section className="ch-round" data-orbit>
        <div className="ch-stick">
          <Corner n="03" text={c.round.kicker} />
          <h2 className="ch-huge">{c.round.big}</h2>
          <div className="ob">
            <svg className="ob-ring" viewBox="0 0 1000 320" aria-hidden="true" preserveAspectRatio="none">
              <ellipse cx="500" cy="160" rx="497" ry="157" />
            </svg>
            <img className="ob-glass" src={IMG('kaca-depan.webp')} alt="" />
            {YEARS.map((y, i) => (
              <div className="ob-card" data-card key={y}>
                <em>{y}</em>
                <span>{c.round.cards[i]}</span>
              </div>
            ))}
          </div>
          <p className="ch-line">{c.round.line}</p>
        </div>
      </section>

      <section className="ch-proof">
        <Corner n="04" text={c.proof.kicker} />
        <h2 className="ch-big" data-wipe>
          {c.proof.big}
        </h2>
        <ul>
          {c.proof.rows.map((r, i) => (
            <li key={i} data-rise>
              <b>{FIGURES[i]}</b>
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <p className="ch-note">
          {c.proof.note}{' '}
          <a href={CONTRACT} target="_blank" rel="noreferrer">
            {c.proof.link}
          </a>
        </p>
      </section>

      <section className="ch-names" data-names>
        <Corner n="05" text={c.names.kicker} />
        <div className="nm-list">
          {WORDS.map((w, i) => (
            <p key={w} data-slide={i % 2 ? '-1' : '1'}>
              <b lang={['id', 'zh', 'ko', 'ja', 'vi'][i]}>{w}</b>
              <span>{c.names.lands[i]}</span>
            </p>
          ))}
        </div>
        <h2 className="ch-big" data-wipe>
          {c.names.big}
        </h2>
      </section>

      <section className="ch-close" data-close>
        <img className="ch-dawn" src={IMG('pagi.webp')} alt="" loading="lazy" />
        <div className="ch-end">
          <Logo className="ch-logo" />
          <h2 className="ch-big">{c.close.big}</h2>
          <p>{c.close.line}</p>
          <div className="ch-doors">
            <a className="ch-go" href={link.beri(DEMO)}>
              {h.guest}
            </a>
            <a className="ch-ghost" href={link.buka()}>
              {h.host}
            </a>
          </div>
          <div className="ch-qr">
            <img src={IMG('qr-tamu.png')} alt="" width="84" height="84" loading="lazy" />
            <span>{c.close.phone}</span>
          </div>
        </div>
        <footer className="ch-foot">
          <span>{c.close.built}</span>
          <span>{h.test}</span>
          <span>Dex Bennett</span>
        </footer>
      </section>
    </div>
  );
}
