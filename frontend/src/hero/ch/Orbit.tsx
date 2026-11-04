import { useEffect, useRef } from 'react';
import { CHAPTERS, CH_DATA } from '../chapters.copy';
import type { Lang } from '../copy';
import { asset, Title } from './shared';

export function Orbit({ lang }: { lang: Lang }) {
  const c = CHAPTERS[lang].round;
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const stage = root.current!;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let dead = false;
    let dispose: (() => void) | undefined;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      observer.disconnect();
      void import('./orbit.scene').then(({ mountOrbit }) => {
        if (!dead) dispose = mountOrbit(stage);
      }).catch(() => stage.classList.add('orbit-fallback'));
    }, { rootMargin: '100% 0px' });
    observer.observe(stage);
    return () => { dead = true; observer.disconnect(); dispose?.(); };
  }, [lang]);
  return (
    <section className="ch-round ch-chapter" data-chapter="3" aria-label={c.kicker} ref={root}>
      <div className="orbit-entry-light" aria-hidden="true" />
      <div className="ch-stage orbit-stage">
        <img className="orbit-sky" src={asset('antariksa')} alt="" loading="lazy" decoding="async" />
        <div className="orbit-vignette" aria-hidden="true" />
        <div className="orbit-year" aria-hidden="true"><span className="orbit-year-roll">{CH_DATA.years.map(y => <span key={y}>{y}</span>)}</span></div>
        <div className="orbit-heading ch-grid"><Title text={c.big} /><p data-lines>{c.line}</p></div>
        <div className="orbit-world">
          <div className="orbit-static" aria-hidden="true"><i /><i /><i /><img src={asset('kaca')} alt="" loading="lazy" /></div>
          <canvas className="orbit-canvas" aria-hidden="true" />
          <div className="orbit-cards">{CH_DATA.years.map((year, i) => <article className="orbit-card" data-orbit-card={i} key={year}>
            <span className="orbit-card-rule" /><span className="ch-label">{CH_DATA.steps[i]}</span><em>{year}</em><b>{CH_DATA.amounts[i]}</b><p>{c.cards[i]}</p><i className="orbit-card-spark" aria-hidden="true" />
          </article>)}</div>
        </div>
        <div className="ch-ledger-line" aria-hidden="true"><i /></div>
      </div>
    </section>
  );
}
