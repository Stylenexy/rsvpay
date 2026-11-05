import { CHAPTERS, CH_DATA, CH_UI } from '../chapters.copy';
import type { Lang } from '../copy';
import { asset, CULTURES, Title } from './shared';

export function Cultures({ lang }: { lang: Lang }) {
  const c = CHAPTERS[lang].names;
  return (
    <section className="ch-names ch-chapter" data-chapter="5" aria-label={c.kicker}>
      <div className="ch-stage names-stage">
        {CULTURES.map((id, i) => <article className={`culture culture-${id}`} key={id}>
          <div className="culture-copy">
            <p className="ch-label">{CH_DATA.cultureSteps[i]}<i />{c.lands[i]}</p>
            <h3 className="culture-word" lang={id}>{CH_DATA.words[i]}</h3>
            <p className="culture-custom">{CH_UI[lang].customs[i]}</p>
          </div>
          <div className="culture-object"><div className="culture-tilt"><img src={asset(`amplop-${id}`)} alt="" loading="lazy" decoding="async" /></div></div>
        </article>)}
        <div className="culture-finale"><div className="culture-fan" aria-hidden="true">{CULTURES.map(id => <img src={asset(`amplop-${id}`)} alt="" key={id} loading="lazy" decoding="async" />)}</div><Title text={c.big} /></div>
        <ol className="culture-rail ch-label" aria-hidden="true">{c.lands.map((land, i) => <li className={`culture-${CULTURES[i]}`} key={land}><i />{land}</li>)}</ol>
      </div>
    </section>
  );
}
