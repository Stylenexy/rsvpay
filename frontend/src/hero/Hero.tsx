import { useEffect, useRef, useState } from 'react';
import { link } from '../lib/app';
import { HERO, LANGS, WORDS, type Lang } from './copy';
import { BRAND } from '../brand';
import { Chapters } from './Chapters';
import { Logo } from './Logo';
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

/** CJK display faces are large, so each loads only when its language is picked. */
const FACE: Partial<Record<Lang, string>> = {
  zh: 'Noto+Serif+SC:wght@500;700',
  ko: 'Noto+Serif+KR:wght@500;700',
  ja: 'Noto+Serif+JP:wght@500;700',
  vi: 'Noto+Serif+Display:wght@500;600',
};

function remembered(): Lang {
  try {
    const v = localStorage.getItem('amplop-lang');
    if (v && v in HERO) return v as Lang;
  } catch {
    // private window: fall through to English
  }
  return 'en';
}

export function Hero() {
  const [lang, setLang] = useState<Lang>(remembered);
  const c = HERO[lang];
  const stage = useRef<HTMLElement>(null);
  const copy = useRef(c);
  copy.current = c;

  useEffect(() => mountHero(stage.current!, () => copy.current), []);

  useEffect(() => {
    // the five words of chapter 05 need only a few glyphs, so ask for just those
    for (const [fam, text] of [
      ['Noto+Serif+SC', WORDS[1]],
      ['Noto+Serif+KR', WORDS[2]],
      ['Noto+Serif+JP', WORDS[3]],
      ['Noto+Serif+Display', WORDS[4]],
    ]) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = `https://fonts.googleapis.com/css2?family=${fam}:wght@500&text=${encodeURIComponent(text)}&display=swap`;
      document.head.append(l);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem('amplop-lang', lang);
    } catch {
      // language is simply not remembered
    }
    const face = FACE[lang];
    if (!face || document.querySelector(`link[data-face=${lang}]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?family=${face}&display=swap`;
    l.dataset.face = lang;
    document.head.append(l);
  }, [lang]);

  return (
    <div className="hz-page" data-lang={lang}>
      <nav className="hz-nav">
        <a className="hz-brand" href={link.beranda()}>
          <Logo />
          {BRAND}
        </a>
        <span className="hz-what">{c.what}</span>
        <span className="hz-navr">
          <span className="hz-langs" role="group" aria-label="Language">
            {LANGS.map((l) => (
              <button
                type="button"
                key={l.id}
                lang={l.id}
                title={l.name}
                aria-label={l.name}
                aria-pressed={l.id === lang}
                className={l.id === lang ? 'on' : ''}
                onClick={() => setLang(l.id)}
              >
                {l.label}
              </button>
            ))}
          </span>
          <a className="hz-cta" href={link.buka()}>
            {c.make}
          </a>
        </span>
      </nav>
      <div className="hz-pin">
      <section className="hz" ref={stage}>
        <canvas className="hz-gl" aria-hidden="true" />

        <div className="hz-load" data-load>
          <Logo />
          <span data-count>0</span>
        </div>


        <div className="hz-beats">
          {c.beats.map((b, i) => (
            <article className="hz-beat" data-beat={i} key={i}>
              <div className="hz-head">
                <span className="hz-under" aria-hidden="true">
                  {b.big}
                </span>
                {i === 0 ? (
                  <h1 className="hz-big">
                    <Big text={b.big} mark={b.mark} />
                  </h1>
                ) : (
                  <h2 className="hz-big">
                    <Big text={b.big} mark={b.mark} />
                  </h2>
                )}
              </div>
              <p className="hz-small">{b.small}</p>
            </article>
          ))}
        </div>

        <aside className="hz-cards">
          <div className="hz-card" data-card="gift">
            <span>{c.gift}</span>
            <b>
              <i>Rp</i>
              <span data-num="gift" />
            </b>
          </div>
          <div className="hz-card" data-card="siti">
            <span>{c.forSiti}</span>
            <b>
              <i>Rp</i>
              <span data-num="siti" />
            </b>
          </div>
          <div className="hz-card seed" data-card="kept">
            <span>{c.kept}</span>
            <b>
              <i>Rp</i>
              <span data-num="kept" />
            </b>
          </div>
        </aside>

        <div className="hz-ring" data-ring>
          <strong>{c.ringTitle}</strong>
          <p>{c.ringLine}</p>
          <button type="button" className="hz-go" data-do="reply">
            {c.reply}
          </button>
          <small>{c.story}</small>
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
          <p className="hz-words">{WORDS.join(' · ')}</p>
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
            <span data-hint-a>{c.drag}</span>
            <span data-hint-b hidden>
              {c.test}
            </span>
          </span>
        </div>
      </section>
      </div>
      <Chapters lang={lang} />
    </div>
  );
}
