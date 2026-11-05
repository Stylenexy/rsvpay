import { Guide } from '../components/Guide';
import { useEffect, useRef, useState } from 'react';
import { RECORDED, replyStory, startStory, type StoryMark, type StorySession, type StoryStep } from '../chain/story';
import type { Entry } from '../chain/types';
import { EnvelopeObject, EnvelopeStory, TxLink } from '../components/parts';
import { say, useCopy } from '../copy';
import { useAmplop } from '../context';
import { link } from '../lib/app';
import { useFormat } from '../lib/lang';
import { useBookMotion, usePageMotion } from '../lib/motion';
import { chainRp } from '../lib/rupiah';

const ORDER: StoryStep[] = ['account', 'family', 'wedding', 'gift', 'years', 'celebration', 'ring', 'reply'];

export function Coba() {
  const t = useCopy();
  const { client, refresh, switchTo } = useAmplop();
  const { formatRp, number } = useFormat();
  const root = useRef<HTMLElement>(null);
  const started = useRef(false);
  const live = useRef(true);
  const beginning = useRef(0);
  const replying = useRef(false);
  const [marks, setMarks] = useState<StoryMark[]>([]);
  const [active, setActive] = useState<StoryStep>('account');
  const [session, setSession] = useState<StorySession | null>(null);
  const [landed, setLanded] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<'limited' | 'helper' | 'network' | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const wishes = useRef({ gift: t.beriWishDefault, reply: say(t.bukuReplyWish, 'Budi') });
  const labels = { account: t.cobaAccount, family: t.cobaFamily, wedding: t.cobaWedding,
    gift: t.cobaGift, years: t.cobaYears, celebration: t.cobaCelebration, ring: t.cobaRing, reply: t.cobaReply, paid: t.bukuWithdraw };
  const seconds = (ms: number) => say(t.cobaSeconds, number(Math.round(ms / 100) / 10));

  usePageMotion(root);
  useBookMotion(root, `${marks.length}:${!!landed}`, !!session && !landed);
  useEffect(() => {
    live.current = true;
    if (!started.current) {
      started.current = true;
      beginning.current = performance.now();
      void startStory(client, wishes.current, (m) => live.current && setMarks((all) => [...all, m]),
        (s) => live.current && setActive(s), () => live.current)
        .then((s) => { if (live.current) { setSession(s); refresh(); } })
        .catch((e: unknown) => {
          if (live.current) {
            const message = String(e);
            setFailure(message.includes('helper') ? /429|rate.?limit|too many|retry in/i.test(message) ? 'limited' : 'helper' : 'network');
            refresh();
          }
        });
    }
    const interval = window.setInterval(() => setElapsed(performance.now() - beginning.current), 500);
    return () => { live.current = false; window.clearInterval(interval); };
  }, [client, refresh]);

  async function reply() {
    if (!session || replying.current || landed) return;
    replying.current = true;
    setBusy(true);
    setFailure(null);
    setActive('reply');
    const start = performance.now();
    try {
      const result = await replyStory(client, session, say(t.bukuReplyWish, 'Budi'));
      if (!live.current) return;
      setMarks((all) => [...all, { step: 'reply', ms: performance.now() - start, hash: result.txHash }]);
      setLanded(result.value);
      setTotal(performance.now() - beginning.current);
      refresh();
    } catch {
      if (live.current) setFailure('network');
    } finally {
      replying.current = false;
      if (live.current) setBusy(false);
    }
  }

  const p = session?.pending;
  return <><Guide role="demo" line={t.guideCoba} step={3} /><main className="app-grid coba-page" ref={root}>
    <div className="story-column">
      <EnvelopeStory title={t.cobaTitle} date={marks.some((m) => m.step === 'years') ? '2028-11-20' : '2026-11-21'} eyebrow={t.cobaStart}>{t.cobaIntro}</EnvelopeStory>
      <ol className="story-timeline glass" aria-label={t.cobaStart} aria-live="polite">
        {ORDER.map((step) => {
          const done = marks.find((m) => m.step === step);
          return <li key={step} data-step={step} data-state={done ? 'done' : active === step ? 'active' : 'waiting'} aria-current={!done && active === step ? 'step' : undefined}>
            <span className="timeline-dot" aria-hidden="true">{done ? '✓' : '·'}</span>
            <div><p>{labels[step]}</p>{done?.hash && <TxLink hash={done.hash} />}</div>
            <small>{done && done.ms > 0 ? seconds(done.ms) : ''}</small>
          </li>;
        })}
      </ol>
    </div>
    <section className="form-panel story-result" aria-live="polite">
      {!session && !failure && <div className="glass card"><h2>{labels[active]}</h2><p className="note">{seconds(elapsed)}</p>{elapsed > 60_000 && <p>{t.cobaSlow}</p>}</div>}
      {p && !landed && <div className="glass card ring-card">
        <i className="ring-orbit" aria-hidden="true" />
        <EnvelopeObject />
        <span className="label">{t.cobaRing}</span>
        <h2>{t.bukuRing}</h2>
        <p>{say(t.cobaRingBody, formatRp(chainRp(p.amount)), formatRp(chainRp(p.seed)), formatRp(chainRp(BigInt(p.amount) - BigInt(p.seed))))}</p>
        <button className="btn" disabled={busy} onClick={() => void reply()}>{busy ? t.cobaSending : t.cobaTap}</button>
      </div>}
      {landed && <div className="glass card done" data-story-complete>
        <span className="success-mark" aria-hidden="true">✧</span>
        <h2>{t.cobaReply}</h2>
        <p>{say(t.cobaLanded, formatRp(chainRp(landed.amount)))}</p>
        <TxLink hash={marks.find((m) => m.step === 'reply')?.hash ?? null} />
        <p>{say(t.cobaTotal, seconds(total ?? 0))}</p>
        <p className="note">{say(t.cobaNetworkTime, seconds(marks.reduce((sum, m) => sum + m.ms, 0)))}</p>
        <a className="btn" href={link.buku(session!.celebration)} onClick={() => switchTo(session!.budi)}>{t.cobaBook}</a>
      </div>}
      {failure && <p role="alert" className="err">{failure === 'limited' ? t.cobaLimited : failure === 'helper' ? t.cobaHelper : t.cobaFailed}</p>}
      <button className="text-link recording-toggle" onClick={() => setRecorded((v) => !v)} aria-expanded={recorded}>{t.cobaRecording}</button>
      {recorded && <div className="glass card recording" data-recording>
        <h2>{t.cobaRecording}</h2><p>{t.cobaRecorded}</p><p className="note">{t.cobaRecordingNote}</p>
        <ol>{RECORDED.map((r) => <li key={r.hash}><p>{labels[r.step]}</p><TxLink hash={r.hash} /></li>)}</ol>
      </div>}
    </section>
  </main></>;
}
