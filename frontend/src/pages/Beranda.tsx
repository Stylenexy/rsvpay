import { Sky } from '../components/parts';
import { t } from '../copy';
import { useAmplop } from '../context';
import { link, useAsync } from '../lib/app';
import { formatRp, chainRp } from '../lib/rupiah';

/** demo amplop seeded on testnet by tools/seed-demo.mjs */
const DEMO: string = import.meta.env.VITE_DEMO_TOKEN ?? '14';

export function Beranda() {
  const { client, account } = useAmplop();
  const mine = useAsync(() => (account ? client.hajatanOf(account) : Promise.resolve([])), [account]);
  return (
    <>
      <Sky langit="fajar" />
      <main>
        <section className="hero">
          <h1>{t.tagline}</h1>
          <p>{t.beranda.lead}</p>
        </section>
        {DEMO && (
          <a className="btn" href={link.beri(DEMO)}>
            {t.beranda.tryGuest}
          </a>
        )}
        <a className={DEMO ? 'btn ghost' : 'btn'} href={link.buka()}>
          {t.beranda.open}
        </a>
        {account && (
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
        )}
      </main>
    </>
  );
}
