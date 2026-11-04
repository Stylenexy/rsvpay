import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Entry, Hajatan, PendingReply } from '../chain/types';
import { EnvelopeObject, Qr, Rp, Sky, TxLink, rng, starShadow } from '../components/parts';
import { plainError, t } from '../copy';
import { useAmplop } from '../context';
import { absoluteLink, copyText, link, shortName, useCountUp, usePoll } from '../lib/app';
import { formatNear } from '../lib/money';
import { STORAGE_MARGIN_YOCTO, formatRp, chainRp } from '../lib/rupiah';

const FIELD_W = 440;
const FIELD_H = 210;

/** where amplop number `i` sits in the sky (stable across visits) */
function spot(i: number) {
  const r = rng(1000 + i * 7);
  return { x: Math.round(24 + r() * (FIELD_W - 48)), y: Math.round(18 + r() * (FIELD_H - 36)) };
}

/** Host page: the amplop as a sky of stars, the guest book, withdraw, and replies that are due. */
export function Buku({ id }: { id: string }) {
  const { client, account } = useAmplop();
  const [h, setH] = useState<Hajatan | null | undefined>(undefined);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pending, setPending] = useState<PendingReply[]>([]);
  const [fresh, setFresh] = useState<number[]>([]);
  const [delta, setDelta] = useState('');
  const [peek, setPeek] = useState<'me' | 'other'>('me');
  const [wd, setWd] = useState<{ busy: boolean; msg: string; hash: string | null } | null>(null);
  const [replies, setReplies] = useState<Record<number, { busy: boolean; hash: string | null; err: string }>>({});
  const [copied, setCopied] = useState(false);
  const [later, setLater] = useState<number[]>([]);
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
      setDelta(t.buku.arrived(formatRp(chainRp(last.amount)), shortName(last.giver)));
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

  if (h === undefined) return <p className="busy">{t.loading}</p>;
  if (h === null) return <p className="err">{t.missing}</p>;

  const holder = account === h.owner_id;
  const locked = !holder || peek === 'other';
  const freeRp = chainRp(h.free);
  const seedRp = chainRp(h.seed_locked);
  const freeShare = Math.max(1, Number((BigInt(h.free) * 1000n) / (BigInt(h.balance) || 1n)));
  const seedShare = Math.max(1, Number((BigInt(h.seed_locked) * 1000n) / (BigInt(h.balance) || 1n)));
  const guestLink = absoluteLink(link.beri(id));

  async function withdraw() {
    setWd({ busy: true, msg: '', hash: null });
    try {
      const r = await client.withdraw(id);
      setWd({ busy: false, msg: t.buku.withdrawn(formatRp(freeRp)), hash: r.txHash });
      await load();
    } catch (e) {
      setWd({ busy: false, msg: plainError(e), hash: null });
    }
  }

  async function reply(p: PendingReply) {
    setReplies((s) => ({ ...s, [p.entry]: { busy: true, hash: null, err: '' } }));
    try {
      const rest = BigInt(p.amount) - BigInt(p.seed);
      const r = await client.reciprocate({
        tokenId: id,
        entry: p.entry,
        toTokenId: p.to_token_id,
        message: `Gantian ya, ${shortName(p.giver)}. Selamat!`,
        depositYocto: (rest + STORAGE_MARGIN_YOCTO).toString(),
      });
      setReplies((s) => ({ ...s, [p.entry]: { busy: false, hash: r.txHash, err: '' } }));
      await load();
    } catch (e) {
      setReplies((s) => ({ ...s, [p.entry]: { busy: false, hash: null, err: plainError(e) } }));
    }
  }

  const shown = [...entries].reverse().slice(0, 8);
  const due = pending.filter((p) => !later.includes(p.entry));
  const ringing = holder && due.length > 0;

  return (
    <div className={wd && !wd.busy && wd.hash ? 'withdrawn' : ''}>
      <Sky langit={ringing ? 'malam' : 'senja'} />
      <main>
        {holder && (
          <div className="gate" role="radiogroup" aria-label="Tampilan">
            <button className={peek === 'me' ? 'on' : ''} onClick={() => setPeek('me')}>
              {t.buku.me}
            </button>
            <button className={peek === 'other' ? 'on' : ''} onClick={() => setPeek('other')}>
              {t.buku.other}
            </button>
          </div>
        )}

        {locked ? (
          <div className="glass locked">
            <small className="label">{h.title}</small>
            <b>{t.buku.lockedTitle(shortName(h.owner_id))}</b>
            <p>{t.buku.lockedBody}</p>
          </div>
        ) : (
          <>
            <div className="field-stars" aria-hidden="true">
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
            </div>

            <div className="total">
              <span className="label">{t.buku.sky(h.title, h.entries)}</span>
              <Rp value={total} />
              {delta ? (
                <span className="delta on" key={delta}>
                  {delta}
                </span>
              ) : (
                <span className="label">≈ {formatNear(h.balance)} NEAR · {t.rateNote}</span>
              )}
            </div>

            <div className="split" aria-hidden="true">
              <i className="fr" style={{ flex: freeShare }} />
              <i className="sd" style={{ flex: seedShare }} />
            </div>
            <div className="legend">
              <span>
                {t.buku.free}
                <b>{formatRp(freeRp)}</b>
              </span>
              <span>
                {t.buku.seed} ({h.seed_bps / 100}%)
                <b>{formatRp(seedRp)}</b>
              </span>
            </div>

            {later.length > 0 && !ringing && <p className="note">{t.buku.laterNote}</p>}
            {ringing &&
              due.slice(0, 2).map((p) => {
                const who = shortName(p.giver);
                const st = replies[p.entry];
                const amountRp = chainRp(p.amount);
                const seedRpP = chainRp(p.seed);
                return (
                  <div className="glass card ring-card" key={p.entry}>
                    <EnvelopeObject />
                    <span className="label">{t.buku.ring}</span>
                    <p className="muted">{t.buku.ringBody(who, formatRp(amountRp))}</p>
                    <p className="big">{t.buku.ringSeed(formatRp(seedRpP), formatRp(amountRp - seedRpP))}</p>
                    {st?.hash ? (
                      <>
                        <p className="seedline">{t.buku.replied}</p>
                        <TxLink hash={st.hash} />
                      </>
                    ) : (
                      <div className="row">
                        <button className="btn" disabled={st?.busy} onClick={() => reply(p)}>
                          {st?.busy ? t.buku.withdrawing : t.buku.reply}
                        </button>
                        <button className="btn ghost" disabled={st?.busy} onClick={() => setLater((l) => [...l, p.entry])}>
                          {t.buku.later}
                        </button>
                      </div>
                    )}
                    {st?.err && <p className="err">{st.err}</p>}
                  </div>
                );
              })}

            <ol className="list glass">
              {shown.length === 0 && <li className="empty">{t.buku.empty}</li>}
              {shown.map((e) => (
                <li key={e.index} className={fresh.includes(e.index) ? 'new' : ''}>
                  <span>{shortName(e.giver)}</span>
                  <i />
                  <b>{formatRp(chainRp(e.amount))}</b>
                  {e.message && <small>“{e.message}”</small>}
                </li>
              ))}
            </ol>

            <button className="btn" disabled={!!wd?.busy || BigInt(h.free) === 0n} onClick={withdraw}>
              {wd?.busy ? t.buku.withdrawing : BigInt(h.free) === 0n ? t.buku.nothing : t.buku.withdraw}
            </button>
            {wd && !wd.busy && (
              <div className="done">
                <p>{wd.msg}</p>
                <TxLink hash={wd.hash} />
              </div>
            )}

            <div className="glass share">
              <b>{t.buku.share}</b>
              <Qr text={guestLink} />
              <p>{t.buku.shareHint}</p>
              <button
                className="btn ghost"
                onClick={async () => {
                  setCopied(await copyText(guestLink));
                  setTimeout(() => setCopied(false), 1800);
                }}
              >
                {copied ? t.buku.copied : t.buku.copy}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
