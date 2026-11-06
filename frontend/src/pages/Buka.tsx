import { Guide } from '../components/Guide';
import { useRef, useState } from 'react';
import { EnvelopeStory, Segmented } from '../components/parts';
import { plainError, useCopy } from '../copy';
import { useAmplop } from '../context';
import { go, link } from '../lib/app';
import { OPEN_DEPOSIT_YOCTO } from '../lib/rupiah';
import { useFormat, useLang } from '../lib/lang';
import { usePageMotion } from '../lib/motion';

/** Host opens a hajatan: the amplop is minted to them with a fixed reply seed. */
export function Buka() {
  const t = useCopy();
  const { lang } = useLang();
  const { percent } = useFormat();
  const root = useRef<HTMLElement>(null);
  usePageMotion(root);
  const { client, account, refresh } = useAmplop();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [host, setHost] = useState('');
  const [bps, setBps] = useState(500);
  const [busy, setBusy] = useState<'' | 'akun' | 'buka'>('');
  const [err, setErr] = useState<unknown>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    try {
      if (!client.account()) {
        if (!host.trim()) {
          setErr('name-required');
          return;
        }
        setBusy('akun');
        await client.createAccount(host);
        refresh();
      }
      setBusy('buka');
      const r = await client.openHajatan({
        title: title.trim() || t.bukaNamesHint,
        date: date || '2026-11-21',
        seedBps: bps,
        depositYocto: OPEN_DEPOSIT_YOCTO.toString(),
      });
      go(link.buku(r.value));
    } catch (x) {
      setErr(x);
      setBusy('');
    }
  }

  return (
    <>
      <Guide role="couple" line={t.guideBuka} step={0} />
      <main className="app-grid open-page" ref={root}>
        <EnvelopeStory title={t.bukaTitle} plain amount={bps * 100}>{t.bukaStory}</EnvelopeStory>
        <form className="form-panel open-form" aria-label={t.bukaForm} onSubmit={submit}>
          <div className="letter">
            <img className="letter-glass" src="/aset/v2/kaca.webp" alt="" />
            <input className="input letter-names" aria-label={t.bukaNames} value={title} placeholder={t.bukaNamesHint} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
            <input className="input letter-date" aria-label={t.bukaDate} type="date" value={date} placeholder={t.bukaDateHint} maxLength={32} onChange={(e) => setDate(e.target.value)} />
          </div>
          {!account && (
            <label className="field">
              <span className="label">{t.bukaHost}</span>
              <input className="input" value={host} placeholder={t.bukaHostHint} onChange={(e) => setHost(e.target.value)} />
            </label>
          )}
          <div className="field">
            <span className="label">{t.bukaSeed}</span>
            <Segmented
              label={t.bukaSeed}
              value={bps}
              onChange={setBps}
              options={[0, 200, 500, 1000].map((v) => ({ value: v, label: percent(v / 10000) }))}
            />
            <span className="label">{t.bukaSeedNote}</span>
          </div>
          <button className="btn" type="submit" disabled={!!busy}>
            {busy === 'akun' ? t.bukaMaking : busy === 'buka' ? t.bukaOpening : t.bukaSubmit}
          </button>
          <p className="next-hint">{t.hintBuka}</p>
          {!!err && <p className="err" role="alert">{err === 'name-required' ? t.bukaNameRequired : plainError(err, lang)}</p>}
        </form>
      </main>
    </>
  );
}
