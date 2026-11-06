import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { DEMO } from '../lib/demo';
import { useAmplop } from '../context';
import { say, useCopy } from '../copy';
import { link } from '../lib/app';
import { useLang } from '../lib/lang';
import { people } from '../lib/people';
import { runTour, tourActive, startTour, type TourEvent } from '../lib/tour';

export type GuideRole = 'couple' | 'guest' | 'visitor' | 'demo';

/** Sits past the page margin on a laptop and by the thumb on a phone. Hover opens it, leaving closes it. */
export function Guide({ role, line, step, done, next }: { role: GuideRole; line: string; step: number; done?: number; next?: string }) {
  const t = useCopy();
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState(false);
  const leaving = useRef(0);
  useEffect(() => {
    // who you are is said once per visit; a finished step is always said
    const seen = `guide-${role}`;
    let first = true;
    try { first = !sessionStorage.getItem(seen); sessionStorage.setItem(seen, '1'); } catch { /* private window */ }
    setBubble(!!done || first);
    const timer = window.setTimeout(() => setBubble(false), done ? 16000 : 6000);
    // the first touch on the page means they are busy; a finished step stays until it has been read
    const away = () => { if (!done) setBubble(false); };
    window.addEventListener('pointerdown', away);
    window.addEventListener('keydown', away);
    return () => { window.clearTimeout(timer); window.removeEventListener('pointerdown', away); window.removeEventListener('keydown', away); };
  }, [role, step, done]);
  if (tourActive()) return null;
  const who = { couple: t.guideYouCouple, guest: t.guideYouGuest, visitor: t.guideYouVisitor, demo: t.guideYouWatch }[role];
  const at = done ?? step;
  const steps: [string, string][] = [[t.guideStep1, link.buka()], [t.guideStep2, link.beri(DEMO)], [t.guideStep3, link.buku(DEMO)], [t.guideStep4, link.coba()]];
  const enter = (e: PointerEvent) => { if (e.pointerType === 'mouse') { window.clearTimeout(leaving.current); setOpen(true); } };
  const leave = (e: PointerEvent) => { if (e.pointerType === 'mouse') leaving.current = window.setTimeout(() => setOpen(false), 160); };
  return (
    <aside className="guide" data-open={open || undefined} aria-label={t.guideHow}>
      <div className="guide-panel" inert={!open} onPointerEnter={enter} onPointerLeave={leave}>
        <p className="guide-who"><b>{who}</b><span>{line}</span></p>
        <ol>{steps.map(([label, href], i) => <li key={label} className={i === at ? 'on' : i < at ? 'past' : ''}><a href={href} aria-current={i === at ? 'step' : undefined}><span>{i < at ? '✓' : i + 1}</span>{label}</a></li>)}</ol>
        <button type="button" className="btn" onClick={startTour}>{t.tourShow}</button>
        <small>{t.tourNote}</small>
      </div>
      {!open && bubble && <div className="guide-bubble" role="status">
        {done ? <><b>{say(t.stepDone, done)}</b>{next && steps[done] && <a href={next}>{say(t.stepNext, done + 1)}: {steps[done][0]} ↗</a>}</> : <><b>{who}</b><span>{line}</span></>}
      </div>}
      <button type="button" className="guide-pill" aria-expanded={open} aria-label={t.guideHow} onPointerEnter={enter} onPointerLeave={leave} onClick={(e) => { if (e.detail === 0 || !matchMedia('(hover: hover)').matches) setOpen(!open); }}>
        <i aria-hidden="true">?</i>
        <span className="guide-label">{t.guideHow}<em aria-hidden="true">|</em><b>{say(t.guideStepOf, Math.min(at + 1, 4))}</b></span>
      </button>
    </aside>
  );
}

/** Drives the real screens with play money, and narrates each step in a small floating card. */
export function TourCard() {
  const t = useCopy();
  const { client, refresh, switchTo } = useAmplop();
  const { lang } = useLang();
  const [state, setState] = useState<TourEvent>({ step: 0, line: 0, done: false });
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !tourActive()) return;
    started.current = true;
    void runTour(client, refresh, switchTo, setState, people(lang));
  }, [client, refresh, switchTo, lang]);
  if (!tourActive()) return null;
  const steps = [t.guideStep1, t.guideStep2, t.guideStep3, t.guideStep4];
  const lines = [t.tourLine0, t.tourLine1, t.tourLine2, t.tourLine3, t.tourLine4, t.tourLine5, t.tourLine6];
  const leave = (hash: string) => { window.location.href = `${window.location.pathname}${hash}`; };
  return (
    <aside className="guide tour-card" role="status">
      <div className="guide-panel">
        <p className="guide-who"><b>{state.failed ? t.errUnknown : state.done ? t.tourDone : t.tourRunning}</b>{!state.failed && <span>{lines[state.line]}</span>}</p>
        <ol>{steps.map((label, i) => <li key={label} className={!state.done && i === state.step ? 'on' : i < state.step ? 'past' : ''}><span>{i < state.step ? '✓' : i + 1}</span>{label}</li>)}</ol>
        {state.done ? <>
          <button type="button" className="btn" onClick={() => leave(link.buka())}>{t.bukuMake}</button>
          <button type="button" className="btn ghost" onClick={() => leave(link.coba())}>{t.cobaStart}</button>
        </> : <button type="button" className="btn ghost" onClick={() => leave(link.beranda())}>{t.tourStop}</button>}
      </div>
    </aside>
  );
}

/** A small label above anything marked data-tip. Touch screens never see it; the floating guide covers them. */
export function PointerTip() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!matchMedia('(hover: hover)').matches) return;
    const show = (event: Event) => {
      const target = (event.target as Element | null)?.closest?.('[data-tip]');
      if (!target) return setTip(null);
      const box = target.getBoundingClientRect();
      setTip({ text: target.getAttribute('data-tip') ?? '', x: Math.min(Math.max(box.left + box.width / 2, 150), innerWidth - 150), y: box.top });
    };
    const hide = () => setTip(null);
    document.addEventListener('pointerover', show);
    document.addEventListener('focusin', show);
    window.addEventListener('scroll', hide, { passive: true });
    return () => { document.removeEventListener('pointerover', show); document.removeEventListener('focusin', show); window.removeEventListener('scroll', hide); };
  }, []);
  if (!tip) return null;
  return <div className="pointer-tip" role="tooltip" ref={(el) => { if (el) { el.style.left = `${tip.x}px`; el.style.top = `${tip.y}px`; } }}>{tip.text}</div>;
}
