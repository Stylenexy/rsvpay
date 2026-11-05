import { useLayoutEffect, useRef } from 'react';
import { CHAPTERS, CH_DATA, CH_UI } from './chapters.copy';
import { mountChapters } from './chapters.motion';
import type { Lang } from './copy';
import { Wedding } from './ch/Wedding';
import { Exchange } from './ch/Exchange';
import { Proof } from './ch/Proof';
import { Cultures } from './ch/Cultures';
import { Close } from './ch/Close';
import { SkyLayer } from './ch/shared';
import './chapters.css';

export function Chapters({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const c = CHAPTERS[lang];
  const u = CH_UI[lang];
  const names = [c.table.kicker, c.round.kicker, c.proof.kicker, c.names.kicker, c.close.big];
  useLayoutEffect(() => mountChapters(root.current!), [lang]);
  return (
    <div className="ch" ref={root} key={lang}>
      <SkyLayer />
      <aside className="ch-index" aria-label={u.index} aria-hidden="true">
        <span className="ch-index-track"><i /></span>
        <span className="ch-index-count"><span>{CH_DATA.digits[0]}</span><span className="ch-digit-mask"><span className="ch-digit-roll">{CH_DATA.digits.map(d => <span key={d}>{d}</span>)}</span></span><span className="ch-index-total"> / {CH_DATA.total}</span></span>
        <span className="ch-index-names">{names.map((name, i) => <span key={i}>{name}</span>)}</span>
      </aside>
      <Wedding lang={lang} />
      <Exchange lang={lang} />
      <Proof lang={lang} />
      <Cultures lang={lang} />
      <Close lang={lang} />
    </div>
  );
}
