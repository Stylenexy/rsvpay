import { CHAPTERS, CH_DATA, CH_UI } from '../chapters.copy';
import type { Lang } from '../copy';
import { asset, Cloud, Title } from './shared';

const PHOTOS = ['p1-qr', 'p2-buku', 'p3-simpan', 'p4-bunyi'];

export function Wedding({ lang }: { lang: Lang }) {
  const c = CHAPTERS[lang].table;
  const u = CH_UI[lang];
  return (
    <section className="ch-table ch-chapter" data-chapter="2" aria-label={c.kicker}>
      <div className="ch-cloud-gate" aria-hidden="true"><Cloud eager /><Cloud second eager className="ch-cloud-back" /></div>
      <div className="ch-stage wedding-stage">
        <div className="ch-atmosphere wedding-atmosphere" aria-hidden="true" />
        <div className="wedding-heading ch-grid"><Title text={c.big} /><p className="ch-label">{u.continue}<span aria-hidden="true">↓</span></p><p className="wedding-calm" aria-hidden="true"><span>{c.big}</span></p></div>
        <div className="cp-row">
          {c.panels.map((panel, i) => (
            <button type="button" className="cp" data-panel={i} key={i} aria-expanded={i === 0}>
              <span className="cp-picture"><img src={asset(PHOTOS[i])} alt="" loading="eager" decoding="async" /></span>
              <span className="cp-shade" />
              <span className="cp-no ch-label"><span>{CH_DATA.steps[i]}</span><i aria-hidden="true">↗</i></span>
              {i === 2 && <span className="cp-split">
                <span><b data-split="95000">{CH_DATA.splitAmounts[0]}</b><span>{u.forSiti}</span></span>
                <span><b data-split="5000">{CH_DATA.splitAmounts[1]}</b><span>{u.kept}</span></span>
              </span>}
              <span className="cp-text"><strong data-panel-lines>{panel.t}</strong><span className="cp-description">{panel.d}</span></span>
              <span className="cp-fold-title" aria-hidden="true">{panel.t}</span>
              <span className="cp-progress" aria-hidden="true"><i /></span>
            </button>
          ))}
        </div>
        <div className="cp-ticks ch-label" aria-hidden="true">{CH_DATA.steps.map(n => <span key={n}>{n}<i /></span>)}</div>
        <div className="ch-phone-light" aria-hidden="true"><i /></div>
      </div>
    </section>
  );
}
