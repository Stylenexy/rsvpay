import { CHAPTERS, CH_DATA, CH_UI } from '../chapters.copy';
import type { Lang } from '../copy';
import { asset, Title } from './shared';

const CULTURES = ['id', 'zh', 'ko', 'ja', 'vi'];

export function Cultures({ lang }: { lang: Lang }) {
  const c = CHAPTERS[lang].names;
  return (
    <section className="ch-names ch-chapter" data-chapter="5" aria-label={c.kicker}>
      <div className="ch-stage names-stage">
        <header className="names-head"><p className="ch-label">{c.kicker}</p><Title text={c.big} /></header>
        <div className="names-window">
          <div className="names-track">
            {CULTURES.map((id, i) => <article className="culture" key={id}>
              <div className="culture-object"><img src={asset(`amplop-${id}`)} alt="" loading="lazy" decoding="async" /></div>
              <div className="culture-copy"><p className="ch-label">{c.lands[i]}</p><h3 className="culture-word" lang={id}>{CH_DATA.words[i]}</h3><p className="culture-custom">{CH_UI[lang].customs[i]}</p></div>
            </article>)}
          </div>
        </div>
      </div>
    </section>
  );
}
