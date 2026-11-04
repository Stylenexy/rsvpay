import { CHAPTERS, CH_DATA, CH_UI } from '../chapters.copy';
import type { Lang } from '../copy';
import { asset, Cloud, Title } from './shared';

const CULTURES = ['id', 'zh', 'ko', 'ja', 'vi'];

export function Cultures({ lang }: { lang: Lang }) {
  const c = CHAPTERS[lang].names;
  return (
    <section className="ch-names ch-chapter" data-chapter="5" aria-label={c.kicker}>
      <div className="ch-stage cultures-stage">
        <div className="culture-fields" aria-hidden="true">{CULTURES.map(id => <i className={`culture-field culture-${id}`} key={id} />)}</div>
        <div className="culture-travel">
          {CULTURES.map((id, i) => <article className={`culture culture-${id}`} data-culture={i} key={id}>
            <div className="culture-ghost" lang={id} aria-hidden="true">{CH_DATA.words[i]}<br />{CH_DATA.words[i]}</div>
            <div className="culture-copy"><p className="ch-label">{CH_DATA.cultureSteps[i]}<i />{c.lands[i]}</p><h3 className="culture-word" lang={id} data-characters>{CH_DATA.words[i]}</h3><p className="culture-custom" data-lines>{CH_UI[lang].customs[i]}</p></div>
            <div className="culture-object"><img src={asset(`amplop-${id}`)} alt="" loading="lazy" decoding="async" /></div>
          </article>)}
        </div>
        <div className="culture-finale"><div className="culture-fan" aria-hidden="true">{CULTURES.map(id => <img src={asset(`amplop-${id}`)} alt="" key={id} loading="lazy" decoding="async" />)}</div><Title text={c.big} /></div>
        <div className="culture-rail ch-label" aria-hidden="true">{c.lands.map((land, i) => <span key={land}><i />{land}<b>{i + 1}</b></span>)}</div>
        <div className="culture-clouds" aria-hidden="true"><Cloud second /><Cloud /></div>
      </div>
    </section>
  );
}
