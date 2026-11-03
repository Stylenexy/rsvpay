import { useState } from 'react';
import { Segmented, Sky } from '../components/parts';
import { plainError, t } from '../copy';
import { useAmplop } from '../context';
import { go, link } from '../lib/app';
import { OPEN_DEPOSIT_YOCTO } from '../lib/rupiah';

/** Host opens a hajatan: the amplop is minted to them with a fixed reply seed. */
export function Buka() {
  const { client, account, refresh } = useAmplop();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [host, setHost] = useState('');
  const [bps, setBps] = useState(500);
  const [busy, setBusy] = useState<'' | 'akun' | 'buka'>('');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr('');
    try {
      if (!client.account()) {
        if (!host.trim()) {
          setErr('Isi namamu dulu.');
          return;
        }
        setBusy('akun');
        await client.createAccount(host);
        refresh();
      }
      setBusy('buka');
      const r = await client.openHajatan({
        title: title.trim() || t.buka.namesHint,
        date: date.trim() || t.buka.dateHint,
        seedBps: bps,
        depositYocto: OPEN_DEPOSIT_YOCTO.toString(),
      });
      go(link.buku(r.value));
    } catch (x) {
      setErr(plainError(x));
      setBusy('');
    }
  }

  return (
    <>
      <Sky langit="fajar" />
      <main>
        <header className="hd">
          <h1>{t.buka.title}</h1>
        </header>
        <form className="glass card" onSubmit={submit}>
          <label className="field">
            <span className="label">{t.buka.names}</span>
            <input className="input" value={title} placeholder={t.buka.namesHint} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">{t.buka.date}</span>
            <input className="input" value={date} placeholder={t.buka.dateHint} maxLength={32} onChange={(e) => setDate(e.target.value)} />
          </label>
          {!account && (
            <label className="field">
              <span className="label">{t.buka.host}</span>
              <input className="input" value={host} placeholder={t.buka.hostHint} onChange={(e) => setHost(e.target.value)} />
            </label>
          )}
          <div className="field">
            <span className="label">{t.buka.seed}</span>
            <Segmented
              label={t.buka.seed}
              value={bps}
              onChange={setBps}
              options={[0, 200, 500, 1000].map((v) => ({ value: v, label: `${v / 100}%` }))}
            />
            <span className="label">{t.buka.seedNote}</span>
          </div>
          <button className="btn" type="submit" disabled={!!busy}>
            {busy === 'akun' ? t.buka.making : busy === 'buka' ? t.buka.opening : t.buka.submit}
          </button>
          {err && <p className="err">{err}</p>}
        </form>
      </main>
    </>
  );
}
