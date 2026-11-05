import { useEffect, useState } from 'react';
import { useCopy } from '../copy';
import { link } from '../lib/app';

const DEMO: string = import.meta.env.VITE_DEMO_TOKEN ?? '14';

export type GuideRole = 'couple' | 'guest' | 'visitor' | 'demo';

/** One quiet line per page: who you are here and what happens next. The whole journey opens from it. */
export function Guide({ role, line, step }: { role: GuideRole; line: string; step: number }) {
  const t = useCopy();
  const [open, setOpen] = useState(false);
  const who = { couple: t.guideYouCouple, guest: t.guideYouGuest, visitor: t.guideYouVisitor, demo: t.guideYouWatch }[role];
  const steps: [string, string][] = [[t.guideStep1, link.buka()], [t.guideStep2, link.beri(DEMO)], [t.guideStep3, link.buku(DEMO)], [t.guideStep4, link.coba()]];
  return (
    <section className="guide" aria-label={t.guideHow}>
      <p><b>{who}</b><span>{line}</span></p>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{t.guideHow}<i aria-hidden="true">{open ? '−' : '+'}</i></button>
      {open && <ol>{steps.map(([label, href], i) => <li key={label} className={i === step ? 'on' : ''}><a href={href} aria-current={i === step ? 'step' : undefined}><span>{i + 1}</span>{label}</a></li>)}</ol>}
    </section>
  );
}

/** A small label beside the pointer for anything marked data-tip. Touch screens never see it; the page guide covers them. */
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
