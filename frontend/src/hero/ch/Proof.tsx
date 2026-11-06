import { useEffect, useRef, useState } from 'react';
import { CHAPTERS, CH_DATA, CH_UI } from '../chapters.copy';
import type { Lang } from '../copy';
import { askNetwork, type Receipt } from './network';
import { gsap, ScrollTrigger } from './animation';
import { asset, CONTRACT, THREAT, THREAT_DOWNLOAD, Title } from './shared';

function NetworkReceipt({ lang }: { lang: Lang }) {
  const u = CH_UI[lang];
  const [status, setStatus] = useState<'idle' | 'pending' | 'received' | 'failed'>('idle');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const controller = useRef<AbortController | null>(null);
  const output = useRef<HTMLDListElement>(null);
  useEffect(() => () => { controller.current?.abort(); controller.current = null; }, [lang]);
  useEffect(() => {
    if (!receipt || !output.current) return;
    // the card grows when the answer lands, which moves everything below it
    const measure = window.setTimeout(() => ScrollTrigger.refresh(), 900);
    const values = [...output.current.querySelectorAll<HTMLElement>('[data-receipt-value]')];
    const text = values.map(value => value.textContent || '');
    const context = gsap.context(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const typing = gsap.timeline({ delay: .3 });
      gsap.set(output.current!.children, { opacity: 0 });
      values.forEach((value, i) => {
        value.textContent = '';
        const cursor = { n: 0 };
        typing.to(value.closest('.network-values > div'), { opacity: 1, duration: .1 })
          .to(cursor, { n: text[i].length, duration: Math.max(.25, text[i].length / 65), ease: 'none', onUpdate: () => { value.textContent = text[i].slice(0, Math.round(cursor.n)); } });
      });
    }, output);
    return () => { window.clearTimeout(measure); context.revert(); values.forEach((value, i) => { value.textContent = text[i]; }); };
  }, [receipt]);
  const ask = async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setStatus('pending');
    setReceipt(null);
    const timeout = window.setTimeout(() => request.abort(), 14000);
    try {
      const answer = await askNetwork(request.signal);
      if (controller.current === request) { setReceipt(answer); setStatus('received'); }
    } catch {
      if (controller.current === request) setStatus('failed');
    } finally { window.clearTimeout(timeout); }
  };
  return <div className="network-receipt" data-status={status}>
    <div className="network-top"><span className="ch-label"><i className={status === 'received' ? 'is-live' : ''} />{u.receipt}</span><span className="ch-label">{CH_DATA.account}</span></div>
    <p className="network-account">{CH_DATA.account}</p>
    <div className="network-action"><button className="ch-button" type="button" data-tip={u.tipAsk} onClick={() => void ask()} disabled={status === 'pending'}><span>{status === 'pending' ? u.asking : u.ask}</span><i aria-hidden="true">↗</i></button><p role="status" aria-live="polite">{status === 'failed' ? u.failed : status === 'received' ? receipt?.matches ? u.received : u.unexpected : u.idle}</p></div>
    <div className="network-result"><div>{receipt && <dl className="network-values" ref={output}>
      <div><dt>{u.keys}</dt><dd><span data-receipt-value>{receipt.keys}</span></dd></div>
      <div className="network-hash"><dt>{u.hash}</dt><dd><code data-receipt-value>{receipt.hash}</code><span className="network-match">{receipt.hash === CH_DATA.hash ? u.matches : u.mismatch}</span></dd></div>
      <div><dt>{u.block}</dt><dd><span data-receipt-value>{receipt.block.toLocaleString(lang)}</span></dd></div>
      <div><dt>{u.elapsed}</dt><dd><span data-receipt-value>{receipt.milliseconds} {CH_DATA.milliseconds}</span></dd></div>
    </dl>}</div></div>
    <a className="network-contract" href={CONTRACT} target="_blank" rel="noreferrer">{CHAPTERS[lang].proof.link}<span aria-hidden="true">↗</span></a>
  </div>;
}

export function Proof({ lang }: { lang: Lang }) {
  const c = CHAPTERS[lang].proof;
  const u = CH_UI[lang];
  return <section className="ch-proof ch-chapter" data-chapter="4" aria-label={c.kicker}>
    <div className="ch-stage proof-stage">
      <div className="proof-copy">
        <Title text={c.big} />
        <p className="proof-fact"><strong>{CH_DATA.figures[0]}</strong><span>{c.rows[0]}</span></p>
        <details className="proof-more">
          <summary>{u.allChecks}</summary>
          <div className="proof-more-body">
            <ul className="proof-facts">{[1, 2, 3].map(i => <li key={i}><strong>{CH_DATA.figures[i]}</strong><span>{c.rows[i]}</span></li>)}</ul>
            <p className="proof-caption">{u.refused} <a href={THREAT} download={THREAT_DOWNLOAD} target="_blank" rel="noreferrer">{u.threat} ↗</a></p>
            <ol className="proof-list">{CH_DATA.attacks.map(a => <li key={a}><code>{a}</code><span aria-hidden="true">×</span></li>)}</ol>
            <p className="proof-caption">{u.tests}</p>
            <ol className="proof-list proof-tests">{CH_DATA.tests.map(test => <li key={test}><span aria-hidden="true">✓</span><code>{test}</code></li>)}</ol>
            <p className="proof-caption">{u.fixed}</p>
          </div>
        </details>
      </div>
      <div className="proof-side">
        <div className="proof-place"><img className="proof-envelope" src={asset('kaca')} alt="" loading="lazy" decoding="async" /></div>
        <NetworkReceipt lang={lang} />
        <p className="ch-honesty">{c.note}</p>
      </div>
    </div>
  </section>;
}
