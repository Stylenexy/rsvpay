import { Sky } from '../components/parts';
import { useCopy } from '../copy';
import { Hero } from '../hero/Hero';
import { useAmplop } from '../context';
import { link, useAsync } from '../lib/app';
import { chainRp } from '../lib/rupiah';
import { useFormat } from '../lib/lang';

export function Beranda() {
  const t = useCopy();
  const { formatRp, date } = useFormat();
  const { client, account } = useAmplop();
  const mine = useAsync(() => (account ? client.hajatanOf(account) : Promise.resolve([])), [account]);
  return (
    <>
      <Hero />
      <a className="btn story-entry" href={link.coba()}>{t.cobaStart} ↗</a>
      {account && (
        <main className="app">
          <Sky langit="malam" />
          <section className="mine">
            <span className="label">{t.berandaMine}</span>
            {mine.data?.length === 0 && <p className="note">{t.berandaNone}</p>}
            {mine.data?.map((h) => (
              <a key={h.token_id} className="glass" href={link.buku(h.token_id)}>
                <span>
                  <b>{h.title}</b>
                  <br />
                  <small className="label">{date(h.date)}</small>
                </span>
                <span className="tok">{formatRp(chainRp(h.balance))}</span>
              </a>
            ))}
          </section>
        </main>
      )}
    </>
  );
}
