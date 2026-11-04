import { useEffect, useRef, useState } from 'react';
import { CHAPTERS, CH_DATA, CH_UI } from '../chapters.copy';
import { LANGS, type Lang } from '../copy';
import { link } from '../../lib/app';
import { asset, Cloud, CONTRACT, THREAT, THREAT_DOWNLOAD, Title } from './shared';

const DEMO: string = import.meta.env.VITE_DEMO_TOKEN ?? '14';

export function Close({ lang }: { lang: Lang }) {
  const c = CHAPTERS[lang].close;
  const u = CH_UI[lang];
  const root = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setNear(true); observer.disconnect(); }
    }, { rootMargin: '100% 0px' });
    observer.observe(root.current!);
    return () => observer.disconnect();
  }, []);
  const replay = () => document.querySelector<HTMLButtonElement>('.hz [data-do="replay"]')?.click();
  const onLanguage = (next: Lang) => document.querySelector<HTMLButtonElement>(`.hz-langs button[lang="${next}"]`)?.click();
  return <section className="ch-close ch-chapter" data-chapter="6" data-close aria-label={c.big} ref={root}>
    <div className="close-cloud-gate" aria-hidden="true"><Cloud second /><Cloud /></div>
    <div className="ch-stage close-stage">
      <img className="close-dawn" src={asset('fajar')} alt="" loading="lazy" decoding="async" />
      <div className="close-sky-wash" aria-hidden="true" />
      <Cloud className="close-cloud-far" second /><Cloud className="close-cloud-near" />
      <div className="close-envelope" aria-hidden="true">
        <i className="close-envelope-light" /><div className="close-envelope-back" />
        <svg className="close-envelope-render" viewBox="0 0 1376 768"><defs><clipPath id={`ch-body-${lang}`}><path d="M0 0H1376V768H0Z M300 140L1076 140L688 466Z" clipRule="evenodd" fillRule="evenodd" /></clipPath><clipPath id={`ch-flap-${lang}`}><path d="M300 140L1076 140L688 466Z" /></clipPath></defs><image href={near ? asset('kaca') : undefined} width="1376" height="768" clipPath={`url(#ch-body-${lang})`} /></svg>
        <div className="close-envelope-flap"><svg viewBox="0 0 1376 768"><image href={near ? asset('kaca') : undefined} width="1376" height="768" clipPath={`url(#ch-flap-${lang})`} /></svg></div>
      </div>
      <div className="close-content"><Title text={c.big} /><p data-lines>{c.line}</p><div className="ch-doors"><a className="ch-button ch-button-dark" data-magnetic href={link.beri(DEMO)}><span>{u.guest}</span><i aria-hidden="true">↗</i></a><a className="ch-button ch-button-glass" data-magnetic href={link.buka()}><span>{u.host}</span><i aria-hidden="true">↗</i></a></div></div>
      <a className="close-qr" href={link.beri(DEMO)}><span className="close-qr-specular" aria-hidden="true" /><img src={`${import.meta.env.BASE_URL}aset/qr-tamu.png`} width="96" height="96" alt="" loading="lazy" /><span>{c.phone}<i aria-hidden="true">↗</i></span></a>
    </div>
    <footer className="ch-footer">
      <div className="footer-grid ch-grid"><div className="footer-note"><img className="footer-emblem" src={asset('logo-kaca')} alt="" loading="lazy" /><p data-lines>{c.line}</p></div><div className="footer-column"><h3>{u.try}</h3><a href={link.beri(DEMO)}>{u.guest}</a><a href={link.buka()}>{u.host}</a><button type="button" onClick={replay}>{u.replay}</button></div><div className="footer-column footer-check"><h3>{u.check}</h3><a href={CONTRACT} target="_blank" rel="noreferrer">{CHAPTERS[lang].proof.link} ↗</a><a href={`${CONTRACT}#contract`} target="_blank" rel="noreferrer" className="footer-hash"><span>{u.hash}</span><code>{CH_DATA.hash}</code></a><a href={THREAT} download={THREAT_DOWNLOAD} target="_blank" rel="noreferrer">{u.threat} ↗</a></div><div className="footer-column footer-languages"><h3>{u.languages}</h3>{LANGS.map((l, i) => <button type="button" lang={l.id} key={l.id} aria-pressed={lang === l.id} onClick={() => onLanguage(l.id)}>{CH_DATA.languages[i]}</button>)}</div></div>
      <div className="footer-bottom"><span>{c.built}</span><span>{u.trial}</span><span>{CH_DATA.author}</span></div>
      <p className="footer-wordmark" aria-label={CH_DATA.brand} style={{ backgroundImage: `url(${asset('fajar')})` }}><span data-wordmark aria-hidden="true">{CH_DATA.brand}</span></p>
    </footer>
  </section>;
}
