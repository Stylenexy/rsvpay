import { Sky } from '../components/parts';
import { t } from '../copy';
import { Hero } from '../hero/Hero';
import { useAmplop } from '../context';
import { link, useAsync } from '../lib/app';
import { formatRp, chainRp } from '../lib/rupiah';

export function Beranda() {
  const { client, account } = useAmplop();
  const mine = useAsync(() => (account ? client.hajatanOf(account) : Promise.resolve([])), [account]);
  return (
    <>
      <Hero />
      {account && (
        <main className="app">
          <Sky langit="malam" />
          <section className="mine">
            <span className="label">{t.beranda.mine}</span>
            {mine.data?.length === 0 && <p className="note">{t.beranda.none}</p>}
            {mine.data?.map((h) => (
              <a key={h.token_id} className="glass" href={link.buku(h.token_id)}>
                <span>
                  <b>{h.title}</b>
                  <br />
                  <small className="label">{h.date}</small>
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
