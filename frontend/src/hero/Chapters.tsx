import { useLayoutEffect, useRef } from 'react';
import { mountChapters } from './chapters.motion';
import type { Lang } from './copy';
import { Wedding } from './ch/Wedding';
import { Exchange } from './ch/Exchange';
import { Proof } from './ch/Proof';
import { Cultures } from './ch/Cultures';
import { Close } from './ch/Close';
import { asset, SkyLayer } from './ch/shared';
import './chapters.css';

export function Chapters({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => mountChapters(root.current!), [lang]);
  return (
    <div className="ch" ref={root} key={lang}>
      <SkyLayer />
      <img className="ch-carrier" data-late={asset('kaca')} alt="" aria-hidden="true" />
      <Wedding lang={lang} />
      <Exchange lang={lang} />
      <Proof lang={lang} />
      <Cultures lang={lang} />
      <Close lang={lang} />
    </div>
  );
}
