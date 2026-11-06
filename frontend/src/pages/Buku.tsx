import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Entry, Hajatan, PendingReply } from '../chain/types';
import { EnvelopeObject, EnvelopeStory, Loading, Missing, Qr, Rp, TxLink, rng, starShadow } from '../components/parts';
import { plainError, say, useCopy } from '../copy';
import { useAmplop } from '../context';
import { absoluteLink, copyText, link, shortName, useCountUp, usePoll } from '../lib/app';
import { useFormat, useLang } from '../lib/lang';
import { useBookMotion, usePageMotion } from '../lib/motion';
import { REPLY_MARGIN_YOCTO, chainRp } from '../lib/rupiah';
import { validReceiver } from '../lib/accounts';
import { Guide } from '../components/Guide';
import { History } from '../components/History';

const FIELD_W = 440;
const FIELD_H = 210;

/** where amplop number `i` sits in the sky (stable across visits) */
function spot(i: number) {
  const r = rng(1000 + i * 7);
  return { x: Math.round(24 + r() * (FIELD_W - 48)), y: Math.round(18 + r() * (FIELD_H - 36)) };
}

/** Host page: the amplop as a sky of stars, the guest book, withdraw, and replies that are due. */
export function Buku({ id }: { id: string }) {
  const t = useCopy();
  const { lang } = useLang();
  const { formatRp, number, percent } = useFormat();
  const root = useRef<HTMLDivElement>(null);
  const { client, account } = useAmplop();
  const [h, setH] = useState<Hajatan | null | undefined>(undefined);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pending, setPending] = useState<PendingReply[]>([]);
  const [fresh, setFresh] = useState<number[]>([]);
  const [delta, setDelta] = useState<{ amount: number; who: string } | null>(null);
  const [peek, setPeek] = useState<'me' | 'other'>('me');
  const [wd, setWd] = useState<{ busy: boolean; amount?: number; error?: unknown; hash: string | null } | null>(null);
  const [replies, setReplies] = useState<Record<number, { busy: boolean; hash: string | null; err: unknown }>>({});
  const [copied, setCopied] = useState(false);
  const [later, setLater] = useState<number[]>([]);
  const [passing, setPassing] = useState(false);
  const [receiver, setReceiver] = useState('');
  const [transfer, setTransfer] = useState<{ busy: boolean; hash: string | null; to?: string; error?: unknown } | null>(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const mutation = useRef(false);
  const known = useRef(-1);

  const load = useCallback(async () => {
    const hh = await client.hajatan(id);
    setH(hh);
    if (!hh) return;
    const es = await client.entries(id, Math.max(0, hh.entries - 300), 300);
    if (known.current >= 0 && hh.entries > known.current) {
      const added = es.filter((e) => e.index >= known.current);
      setFresh(added.map((e) => e.index));
      const last = added[added.length - 1];
      setDelta({ amount: chainRp(last.amount), who: shortName(last.giver) });
    }
    known.current = hh.entries;
    setEntries(es);
    setPending(await client.pendingReplies(id));
  }, [client, id]);

  useEffect(() => {
    load().catch(() => setH(null));
  }, [load]);
  usePoll(() => void load().catch(() => {}), 4000);

  const total = useCountUp(h ? chainRp(h.balance) : 0);
  const stars = useMemo(() => {
    const plain = entries.filter((e) => BigInt(e.seed) === 0n && !fresh.includes(e.index));
    const seeded = entries.filter((e) => BigInt(e.seed) > 0n && !fresh.includes(e.index));
    const list = (es: Entry[]) => es.map((e) => spot(e.index));
    const toShadow = (pts: { x: number; y: number }[], size: string, color: string) => pts.map((p) => `${p.x}px ${p.y}px 0 ${size} ${color}`).join(',');
    return {
      plain: toShadow(list(plain), '1px', 'var(--star)'),
      seeded: toShadow(list(seeded), '1.6px', 'var(--seed)'),
      ambient: starShadow(40, FIELD_W, FIELD_H, 77, [0.2, 0.6]),
    };
  }, [entries, fresh]);

  const isRinging = !!h && account === h.owner_id && pending.some((p) => !later.includes(p.entry));
  usePageMotion(root, !!h);
  useBookMotion(root, `${h?.token_id}:${peek}:${entries.map((e) => e.index).join(',')}`, isRinging);

  if (h === undefined) return <Loading />;
  if (h === null) return <Missing />;

  const holder = account === h.owner_id;
  const locked = !holder || peek === 'other';
  const freeRp = chainRp(h.free);
  const seedRp = chainRp(h.seed_locked);
  const freeShare = Math.max(1, Number((BigInt(h.free) * 1000n) / (BigInt(h.balance) || 1n)));
  const seedShare = Math.max(1, Number((BigInt(h.seed_locked) * 1000n) / (BigInt(h.balance) || 1n)));
  const guestLink = absoluteLink(link.beri(id));

  async function withdraw() {
    if (mutation.current) return;
    mutation.current = true;
    setWd({ busy: true, hash: null });
    try {
      const r = await client.withdraw(id);
      setWd({ busy: false, amount: freeRp, hash: r.txHash });
      await load();
      setHistoryRevision((n) => n + 1);
    } catch (e) {
      setWd({ busy: false, error: e, hash: null });
    } finally {
      mutation.current = false;
    }
  }

  async function reply(p: PendingReply) {
    if (mutation.current) return;
    mutation.current = true;
    setReplies((s) => ({ ...s, [p.entry]: { busy: true, hash: null, err: '' } }));
    try {
      const rest = BigInt(p.amount) - BigInt(p.seed);
      const r = await client.reciprocate({
        tokenId: id,
        entry: p.entry,
        toTokenId: p.to_token_id,
        message: say(t.bukuReplyWish, shortName(p.giver)),
        depositYocto: (rest + REPLY_MARGIN_YOCTO).toString(),
      });
      setReplies((s) => ({ ...s, [p.entry]: { busy: false, hash: r.txHash, err: '' } }));
      await load();
      setHistoryRevision((n) => n + 1);
    } catch (e) {
      setReplies((s) => ({ ...s, [p.entry]: { busy: false, hash: null, err: e } }));
    } finally {
      mutation.current = false;
    }
  }

  async function pass() {
    const to = receiver.trim();
    if (!h || mutation.current || !validReceiver(to, h.owner_id)) return;
    mutation.current = true;
    setTransfer({ busy: true, hash: null });
    try {
      const r = await client.transfer(id, to);
      setH((current) => current ? { ...current, owner_id: to } : current);
      setTransfer({ busy: false, hash: r.txHash, to });
      setPassing(false);
      await load();
      setHistoryRevision((n) => n + 1);
    } catch (error) {
      setTransfer({ busy: false, hash: null, error });
      // A lost response may still have transferred ownership. Re-read the gate.
      await load().catch(() => {});
    } finally {
      mutation.current = false;
    }
  }

  const shown = [...entries].reverse().slice(0, 8);
  const due = pending.filter((p) => !later.includes(p.entry));
  const ringing = holder && due.length > 0;
  const cameBack = [...entries].reverse().find((e) => e.reply_to);

  const share = (
            <div className="glass share">
              <b>{t.bukuShare}</b>
              <Qr text={guestLink} />
              <p>{t.bukuShareHint}</p>
              <button
                className="btn ghost"
                onClick={async () => {
                  setCopied(await copyText(guestLink));
                  setTimeout(() => setCopied(false), 1800);
                }}
              >
                {copied ? t.bukuCopied : t.bukuCopy}
              </button>
            </div>
  );

  return (
    <div className={wd && !wd.busy && wd.hash ? 'withdrawn' : ''} ref={root}>
      <Guide role={holder ? 'couple' : 'visitor'} line={holder ? t.guideBukuOwner : t.guideBukuVisitor} step={2} done={holder ? (h.entries === 0 ? 1 : 3) : undefined} next={h.entries === 0 ? link.beri(id) : link.coba()} />
      <main className={`app-grid book-page${ringing ? ' is-ringing' : ''}`}>
        <div className="story-column">
          <EnvelopeStory title={h.title} date={h.date}>{locked ? t.bukuVisitorStory : t.bukuStory}</EnvelopeStory>
          {!locked && (<div className="field-stars" aria-hidden="true">
              <i className="free" style={{ boxShadow: [stars.ambient, stars.plain].filter(Boolean).join(',') }} />
              {stars.seeded && <i className="seed" style={{ boxShadow: stars.seeded }} />}
              {fresh.map((i) => {
                const p = spot(i);
                return (
                  <span key={i}>
                    <i className="shoot" style={{ left: p.x - 110, top: p.y }} />
                    <i className="new-star" style={{ left: p.x, top: p.y, animationDelay: '0.6s' }} />
                  </span>
                );
              })}
            </div>)}
        </div>
        <section className="form-panel book-panel" aria-label={h.title}>
        {transfer?.to && <div className="glass card" role="status"><p className="history-account">{say(t.passDone, transfer.to)}</p><TxLink hash={transfer.hash} /></div>}
        {holder && (
          <div className="gate" role="radiogroup" aria-label={t.bukuView}>
            <button className={peek === 'me' ? 'on' : ''} aria-pressed={peek === 'me'} onClick={() => setPeek('me')}>
              {t.bukuMe}
            </button>
            <button className={peek === 'other' ? 'on' : ''} aria-pressed={peek === 'other'} onClick={() => setPeek('other')}>
              {t.bukuOther}
            </button>
          </div>
        )}

        {locked ? (
          <div className="glass locked">
            <span className="visitor-mark" aria-hidden="true">✧</span>
            <b>{say(t.bukuLockedTitle, shortName(h.owner_id))}</b>
            <p>{t.bukuLockedBody}</p>
            <div className="visitor-next">
              <h2>{t.bukuLockedNext}</h2>
              <a className="btn" href={link.beri(id)}>{t.bukuGuest}</a>
              <a className="btn ghost" href={link.buka()}>{t.bukuMake}</a>
              <a className="text-link" href={link.beranda()}>{t.notFoundBack} ↗</a>
            </div>
          </div>
        ) : (
          <>
            <div className="total">
              <span className="label">{say(t.bukuSky, h.title, number(h.entries))}</span>
              <Rp value={total} animate={false} />
              {delta ? (
                <span className="delta on" key={`${delta.amount}:${delta.who}`}>
                  {say(t.bukuArrived, formatRp(delta.amount), delta.who)}
                </span>
              ) : (
                <span className="label">{say(t.rateNote, formatRp(500000))}</span>
              )}
            </div>

            <div className="split" aria-hidden="true">
              <i className="fr" style={{ flex: freeShare }} />
              <i className="sd" style={{ flex: seedShare }} />
            </div>
            <div className="legend">
              <span>
                {h.entries === 0 ? t.bukuDepositLeft : t.bukuFree}
                <b>{formatRp(freeRp)}</b>
              </span>
              <span>
                {t.bukuSeed} ({percent(h.seed_bps / 10000)})
                <b>{formatRp(seedRp)}</b>
              </span>
            </div>

            {h.entries === 0 && share}
            {later.length > 0 && !ringing && <p className="note">{t.bukuLaterNote}</p>}
            {ringing &&
              due.slice(0, 2).map((p) => {
                const who = shortName(p.giver);
                const st = replies[p.entry];
                const amountRp = chainRp(p.amount);
                const seedRpP = chainRp(p.seed);
                return (
                  <div className="glass card ring-card" key={p.entry} role="status">
                    <i className="ring-orbit" aria-hidden="true" />
                    <EnvelopeObject />
                    <span className="label">{t.bukuRing}</span>
                    <p className="muted">{say(t.bukuRingBody, who, formatRp(amountRp))}</p>
                    <p className="big">{say(t.bukuRingSeed, formatRp(seedRpP), formatRp(amountRp - seedRpP))}</p>
                    {st?.hash ? (
                      <>
                        <p className="seedline">{t.bukuReplied}</p>
                        <TxLink hash={st.hash} />
                      </>
                    ) : (
                      <div className="row">
                        <button className="btn" disabled={st?.busy || !!transfer?.busy || !!wd?.busy} onClick={() => reply(p)}>
                          {st?.busy ? t.bukuWithdrawing : t.bukuReply}
                        </button>
                        <button className="btn ghost" disabled={st?.busy} onClick={() => setLater((l) => [...l, p.entry])}>
                          {t.bukuLater}
                        </button>
                      </div>
                    )}
                    {!!st?.err && <p className="err" role="alert">{plainError(st.err, lang)}</p>}
                  </div>
                );
              })}

            {cameBack && (
              <div className="glass card ring-card reply-card" role="status">
                <EnvelopeObject />
                <span className="label">{t.replyCardLabel}</span>
                <p className="big">{say(t.replyCardTitle, shortName(cameBack.giver), formatRp(chainRp(cameBack.amount)))}</p>
                {cameBack.message && <p className="muted">“{cameBack.message}”</p>}
                {cameBack.reply_to && <a className="text-link" href={link.buku(cameBack.reply_to.token_id)}>{t.historyRelated} ↗</a>}
              </div>
            )}

            <ol className="list glass">
              {shown.length === 0 && <li className="empty">{t.bukuEmpty}</li>}
              {shown.map((e) => (
                <li key={e.index} className={fresh.includes(e.index) ? 'new' : ''}>
                  <span>{shortName(e.giver)}</span>
                  <i />
                  <b>{formatRp(chainRp(e.amount))}</b>
                  {e.message && <small>“{e.message}”</small>}
                  {e.reply_to && <a className="entry-link" href={link.buku(e.reply_to.token_id)}>{t.bukuIsReply} ↗</a>}
                  {e.replied && <a className="entry-link" href={link.buku(e.replied.token_id)}>{t.bukuGivenBack} ↗</a>}
                  {!e.replied && BigInt(e.seed) > 0n && <span className="entry-seed">{say(t.bukuKeptLine, formatRp(chainRp(e.seed)))}</span>}
                </li>
              ))}
            </ol>

            <button className="btn" disabled={!!wd?.busy || !!transfer?.busy || Object.values(replies).some((r) => r.busy) || BigInt(h.free) === 0n} onClick={withdraw}>
              {wd?.busy ? t.bukuWithdrawing : BigInt(h.free) === 0n ? t.bukuNothing : t.bukuWithdraw}
            </button>
            <p className="next-hint">{t.hintTake}</p>
            {wd && !wd.busy && (
              <div className="done">
                <p>{wd.error ? plainError(wd.error, lang) : say(t.bukuWithdrawn, formatRp(wd.amount ?? 0))}</p>
                <TxLink hash={wd.hash} />
              </div>
            )}

            <div className="glass card pass-envelope">
              {!passing ? <button className="btn ghost" disabled={!!wd?.busy || Object.values(replies).some((r) => r.busy)} onClick={() => setPassing(true)}>{t.passTitle}</button> : <>
                <h2>{t.passTitle}</h2><p>{t.passMeaning}</p>
                <label className="field"><span className="label">{t.passAccount}</span><input className="input" value={receiver} autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={transfer?.busy} onChange={(e) => setReceiver(e.target.value)} /></label>
                {!!receiver && !validReceiver(receiver.trim(), h.owner_id) && <p className="err">{t.passInvalid}</p>}
                <button className="btn" disabled={!!transfer?.busy || !validReceiver(receiver.trim(), h.owner_id)} onClick={() => void pass()}>{transfer?.busy ? t.bukuWithdrawing : say(t.passConfirm, receiver.trim())}</button>
                <button className="btn ghost" disabled={transfer?.busy} onClick={() => setPassing(false)}>{t.passCancel}</button>
                {!!transfer?.error && <p className="err" role="alert">{plainError(transfer.error, lang)}</p>}
              </>}
            </div>
            <History hajatan={h} revision={historyRevision + h.entries} />
            {h.entries > 0 && share}
          </>
        )}
        </section>
      </main>
    </div>
  );
}
