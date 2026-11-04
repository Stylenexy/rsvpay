import { useEffect, useRef, useState } from 'react';
import { link } from '../lib/app';
import { HERO, type Lang } from './copy';
import { mountHero } from './mount';
import './hero.theme.css';
import './hero.css';

const DEMO: string = import.meta.env.VITE_DEMO_TOKEN ?? '14';

/** Wraps the highlighted words so they can carry their own light. */
function Big({ text, mark }: { text: string; mark: string }) {
  const at = text.indexOf(mark);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="hz-mark">{mark}</span>
      {text.slice(at + mark.length)}
    </>
  );
}

export function Hero() {
  const [lang, setLang] = useState<Lang>('id');
  const c = HERO[lang];
  const stage = useRef<HTMLElement>(null);
  const copy = useRef(c);
  copy.current = c;

  useEffect(() => mountHero(stage.current!, () => copy.current), []);

  return (
    <div className="hz-pin">
      <section className="hz" ref={stage}>
        <canvas className="hz-gl" aria-hidden="true" />

        <div className="hz-load" data-load>
          <span data-count>0</span>
        </div>

        <nav className="hz-nav">
          <a className="hz-brand" href={link.beranda()}>
            Amplop Balas
          </a>
          <span className="hz-what">{c.what}</span>
          <span className="hz-navr">
            <button
              type="button"
              className="hz-lang"
              aria-label={lang === 'id' ? 'Switch to English' : 'Ganti ke bahasa Indonesia'}
              onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
            >
              {lang === 'id' ? 'EN' : 'ID'}
            </button>
            <a className="hz-cta" href={link.buka()}>
              {c.make}
            </a>
          </span>
        </nav>

        <div className="hz-beats">
          {c.beats.map((b, i) => (
            <article className="hz-beat" data-beat={i} key={i}>
              {i === 0 ? (
                <h1 className="hz-big">
                  <Big text={b.big} mark={b.mark} />
                </h1>
              ) : (
                <h2 className="hz-big">
                  <Big text={b.big} mark={b.mark} />
                </h2>
              )}
              <p className="hz-small">{b.small}</p>
            </article>
          ))}
        </div>

        <aside className="hz-cards">
          <div className="hz-card" data-card="gift">
            <span>{c.gift}</span>
            <b data-num="gift" />
          </div>
          <div className="hz-card" data-card="siti">
            <span>{c.forSiti}</span>
            <b data-num="siti" />
          </div>
          <div className="hz-card seed" data-card="kept">
            <span>{c.kept}</span>
            <b data-num="kept" />
          </div>
        </aside>

        <div className="hz-ring" data-ring>
          <strong>{c.ringTitle}</strong>
          <p>{c.ringLine}</p>
          <button type="button" className="hz-go" data-do="reply">
            {c.reply}
          </button>
        </div>

        <div className="hz-end" data-end>
          <a className="hz-go" href={link.beri(DEMO)}>
            {c.guest}
          </a>
          <a className="hz-ghost" href={link.buka()}>
            {c.host}
          </a>
          <button type="button" className="hz-text" data-do="replay">
            {c.replay}
          </button>
        </div>

        <div className="hz-rail" data-rail>
          <span className="hz-date" data-date />
          <div className="hz-track" data-track>
            <i className="hz-fill" data-fill />
            {c.rail.map((r, i) => (
              <span className="hz-stop" style={{ left: `${[13, 36, 60, 84, 100][i]}%` }} data-dot key={r}>
                <em>{r}</em>
              </span>
            ))}
            <i className="hz-knob" data-knob />
          </div>
          <span className="hz-hint" data-hint>
            {c.drag}
          </span>
        </div>
      </section>
    </div>
  );
}
