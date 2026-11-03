import { useRef, useState, type CSSProperties } from 'react';
import { EnvelopeObject, Rp, Segmented, SlideToGive, Sky, TxLink } from '../components/parts';
import { plainError, t } from '../copy';
import { useAmplop } from '../context';
import { shortName, useAsync } from '../lib/app';
import { formatNear } from '../lib/money';
import { GIFT_STEPS, STORAGE_MARGIN_YOCTO, formatRp, rupiahToYocto, shortRp, chainRp } from '../lib/rupiah';

type Phase = 'idle' | 'akun' | 'kirim' | 'done';

/** Guest page, reached from the QR on the reception table: choose, write, slide. */
export function Beri({ id }: { id: string }) {
  const { client, account, refresh } = useAmplop();
  const h = useAsync(() => client.hajatan(id), [id]);
  const [rp, setRp] = useState<number>(GIFT_STEPS[1]);
  const [name, setName] = useState('');
  const [wish, setWish] = useState('Selamat menempuh hidup baru');
  const [phase, setPhase] = useState<Phase>('idle');
  const [err, setErr] = useState('');
  const [out, setOut] = useState<{ hash: string | null; seedRp: number } | null>(null);
  const [star, setStar] = useState<CSSProperties | null>(null);
  const card = useRef<HTMLDivElement>(null);

  if (h.loading && !h.data) return <p className="busy">{t.loading}</p>;
  if (!h.data) return <p className="err">{t.missing}</p>;
  const hajatan = h.data;

  async function give() {
    if (phase !== 'idle') return;
    setErr('');
    try {
      if (!client.account()) {
        if (!name.trim()) {
          setErr('Isi namamu dulu, supaya tuan rumah tahu siapa yang memberi.');
          return;
        }
        setPhase('akun');
        await client.createAccount(name);
        refresh();
      }
      setPhase('kirim');
      const deposit = rupiahToYocto(rp) + STORAGE_MARGIN_YOCTO;
      const r = await client.give({ tokenId: id, message: wish.trim() || 'Selamat!', depositYocto: deposit.toString() });
      const [e] = await client.entries(id, r.value, 1);
      const box = card.current?.getBoundingClientRect();
      if (box) {
        const y = box.top + box.height / 2;
        setStar({ ['--sy' as string]: `${y}px`, ['--up' as string]: `${70 - y}px` });
      }
      setOut({ hash: r.txHash, seedRp: e ? chainRp(e.seed) : 0 });
      setPhase('done');
    } catch (e) {
      setErr(plainError(e));
      setPhase('idle');
    }
  }

  const busy = phase === 'akun' || phase === 'kirim';
  return (
    <div className={phase === 'done' ? 'sent' : ''}>
      <Sky langit="fajar" />
      <main>
        <header className="hd">
          <small>{t.beri.for}</small>
          <h1>{hajatan.title}</h1>
          <small>{hajatan.date}</small>
        </header>

        <div className="glass card give-card" ref={card}>
          <div className="card-top">
            <span className="label">{t.beri.youGive}</span>
            <span className="tok">amplop #{hajatan.token_id} · {client.mode === 'mock' ? 'tiruan' : 'testnet'}</span>
          </div>
          <Rp value={rp} />
          <EnvelopeObject />
          <Segmented label={t.beri.youGive} options={GIFT_STEPS.map((v) => ({ value: v, label: shortRp(v) }))} value={rp} onChange={setRp} />
          <span className="label">≈ {formatNear(rupiahToYocto(rp))} NEAR · {t.rateNote}</span>
        </div>

        {phase !== 'done' && (
          <>
            {!account && (
              <label className="field">
                <span className="label">{t.beri.name}</span>
                <input className="input" value={name} placeholder={t.beri.nameHint} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
              </label>
            )}
            <input className="input wish" value={wish} placeholder={t.beri.wishHint} aria-label={t.beri.wish} maxLength={280} onChange={(e) => setWish(e.target.value)} />
            {!hajatan.open ? (
              <p className="err">{t.beri.closed}</p>
            ) : (
              <SlideToGive label={t.beri.slide} disabled={busy} onGive={give} />
            )}
            {busy && <p className="busy">{phase === 'akun' ? t.beri.making : t.beri.sending}</p>}
            {err && <p className="err">{err}</p>}
          </>
        )}

        {phase === 'done' && out && (
          <div className="done">
            <p>{t.beri.done(hajatan.title)}</p>
            {out.seedRp > 0 && <p className="seedline">{t.beri.seedLine(formatRp(out.seedRp))}</p>}
            <TxLink hash={out.hash} />
            <button className="btn ghost" onClick={() => { setPhase('idle'); setOut(null); setStar(null); h.reload(); }}>
              {t.beri.again}
            </button>
          </div>
        )}
        {star && <i className="star-rise" style={star} aria-hidden="true" />}
        {account && phase !== 'done' && <p className="note">Memberi sebagai {shortName(account)}</p>}
      </main>
    </div>
  );
}
