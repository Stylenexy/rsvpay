import { CHAPTERS, CH_DATA } from '../chapters.copy';
import type { Lang } from '../copy';
import { asset, Title } from './shared';

export function Exchange({ lang }: { lang: Lang }) {
  const c = CHAPTERS[lang].round;
  return (
    <section className="ch-round ch-chapter" data-chapter="3" aria-label={c.kicker}>
      <div className="ch-stage round-stage">
        <div className="round-copy"><p className="ch-label">{c.kicker}</p><Title text={c.big} /><p className="round-line">{c.line}</p></div>
        <div className="round-scene">
          <div className="round-flight">
            {CH_DATA.years.map((year, i) => <article className="round-letter" key={year}>
              <span className="round-letter-top ch-label"><em>{year}</em><i>{CH_DATA.steps[i]}</i></span><p>{c.cards[i]}</p><b>{CH_DATA.amounts[i]}</b>
            </article>)}
            <img className="round-envelope" src={asset('kaca')} alt="" loading="lazy" decoding="async" />
          </div>
          <ol className="round-rail ch-label" aria-hidden="true"><i />{CH_DATA.years.map(year => <li key={year}>{year}</li>)}</ol>
        </div>
      </div>
    </section>
  );
}
