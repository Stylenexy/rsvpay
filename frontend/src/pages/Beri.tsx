import { Guide } from '../components/Guide';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { EnvelopeStory, Rp, Segmented, SlideToGive, TxLink, Loading, Missing } from '../components/parts';
import { plainError, say, useCopy } from '../copy';
import { useAmplop } from '../context';
import { link, shortName, useAsync } from '../lib/app';
import { gsap } from 'gsap';
import { useFormat, useLang } from '../lib/lang';
import { usePageMotion } from '../lib/motion';
import { GIFT_STEPS, STORAGE_MARGIN_YOCTO, rupiahToYocto, chainRp } from '../lib/rupiah';

type Phase = 'idle' | 'akun' | 'kirim' | 'done';

/** Guest page, reached from the QR on the reception table: choose, write, slide. */
export function Beri({ id }: { id: string }) {
  const t = useCopy();
  const { lang } = useLang();
  const { formatRp, shortRp } = useFormat();
  const root = useRef<HTMLDivElement>(null);
  const { client, account, refresh } = useAmplop();
  const h = useAsync(() => client.hajatan(id), [id]);
  const [rp, setRp] = useState<number>(GIFT_STEPS[1]);
  const [name, setName] = useState('');
  const [wish, setWish] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [err, setErr] = useState<unknown>(null);
  const [out, setOut] = useState<{ hash: string | null; seedRp: number } | null>(null);
  const [star, setStar] = useState<CSSProperties | null>(null);
  const card = useRef<HTMLDivElement>(null);

  usePageMotion(root, !!h.data);
  useLayoutEffect(() => {
    if (phase !== 'done') return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => {
        const timeline = gsap.timeline();
        timeline.set('.done', { autoAlpha: 0 }).to('.give-card', { scale: 0.025, opacity: 0, rotate: -6, duration: 0.8, ease: 'power3.inOut' })
          .fromTo('.star-rise', { scale: 0, opacity: 0 }, { scale: 1.4, opacity: 1, duration: 0.45 }, 0.55)
          .to('.star-rise', { y: -200, scale: 0.7, duration: 1.7, ease: 'power2.out' }, 0.85)
          .to('.done', { autoAlpha: 1, duration: 0.65 }, 1.05)
          .from('.done > *', { opacity: 0, y: 18, stagger: 0.12, duration: 0.9, ease: 'power3.out' }, 1.1);
      }, root);
      return () => ctx.revert();
    });
    return () => media.revert();
  }, [phase]);

  if (h.loading && !h.data) return <Loading />;
  if (!h.data) return <Missing />;
  const hajatan = h.data;

  async function give() {
    if (phase !== 'idle') return;
    setErr(null);
    try {
      if (!client.account()) {
        if (!name.trim()) {
          setErr('name-required');
          return;
        }
        setPhase('akun');
        await client.createAccount(name);
        refresh();
      }
      setPhase('kirim');
      const deposit = rupiahToYocto(rp) + STORAGE_MARGIN_YOCTO;
      const r = await client.give({ tokenId: id, message: (wish ?? t.beriWishDefault).trim() || t.beriWishDefault, depositYocto: deposit.toString() });
      const [e] = await client.entries(id, r.value, 1);
      const box = card.current?.getBoundingClientRect();
      if (box) {
        const y = box.top + box.height / 2;
        setStar({ ['--sx' as string]: `${box.left + box.width / 2}px`, ['--sy' as string]: `${y}px` });
      }
      setOut({ hash: r.txHash, seedRp: e ? chainRp(e.seed) : 0 });
      setPhase('done');
    } catch (e) {
      setErr(e);
      setPhase('idle');
    }
  }

  const busy = phase === 'akun' || phase === 'kirim';
  return (
    <div className={phase === 'done' ? 'sent' : ''} ref={root}>
      <Guide role="guest" line={t.guideBeri} step={1} done={phase === 'done' ? 2 : undefined} next={link.buku(id)} />
      <main className="app-grid guest-page">
        <div className="story-column">
          <EnvelopeStory title={hajatan.title} date={hajatan.date} eyebrow={t.beriFor} amount={rp}>{t.beriStory}</EnvelopeStory>
        </div>
        <section className="form-panel gift-panel" aria-label={t.beriYouGive}>
          <div className="glass card give-card" ref={card} inert={phase === 'done'}>
            <div className="card-top">
              <span className="label">{t.beriYouGive}</span>
              <span className="tok">{say(t.envelopeNumber, hajatan.token_id)}</span>
            </div>
            <Rp value={rp} />
            <Segmented label={t.beriYouGive} options={GIFT_STEPS.map((v) => ({ value: v, label: shortRp(v) }))} value={rp} onChange={setRp} />
            <span className="label rate-note">{say(t.rateNote, formatRp(500000))}</span>
            <div className="give-details">
              {!account && <label className="field">
                <span className="label">{t.beriName}</span>
                <input className="input" value={name} placeholder={t.beriNameHint} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
              </label>}
              <label className="field wish-field">
                <span className="label">{t.beriWish}</span>
                <input className="input wish" value={wish ?? t.beriWishDefault} placeholder={t.beriWishHint} aria-label={t.beriWish} maxLength={280} onChange={(e) => setWish(e.target.value)} />
              </label>
              {!hajatan.open ? <p className="err">{t.beriClosed}</p> : <SlideToGive label={t.beriSlide} disabled={busy} onGive={give} />}
              {hajatan.open && <p className="next-hint">{t.hintBeri}</p>}
              {busy && <p className="busy" role="status">{phase === 'akun' ? t.beriMaking : t.beriSending}</p>}
              {!!err && <p className="err" role="alert">{err === 'name-required' ? t.beriNameRequired : plainError(err, lang)}</p>}
              {account && <p className="note giving-as">{say(t.beriAs, shortName(account))}</p>}
            </div>
          </div>
          {phase === 'done' && out && <div className="done glass card" role="status">
            <span className="success-mark" aria-hidden="true">✧</span>
            <h2>{t.beriDoneTitle}</h2>
            <p>{say(t.beriDone, hajatan.title)}</p>
            {out.seedRp > 0 && <p className="seedline">{say(t.beriSeedLine, formatRp(out.seedRp))}</p>}
            <TxLink hash={out.hash} />
            <button className="btn ghost" onClick={() => { setPhase('idle'); setOut(null); setStar(null); h.reload(); }}>{t.beriAgain}</button>
          </div>}
        </section>
        {star && <i className="star-rise" style={star} aria-hidden="true" />}
      </main>
    </div>
  );
}
