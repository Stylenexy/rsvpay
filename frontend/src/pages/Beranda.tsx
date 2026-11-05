import { useCopy } from '../copy';
import { Hero } from '../hero/Hero';
import { useAmplop } from '../context';
import { link, useAsync } from '../lib/app';

export function Beranda() {
  const t = useCopy();
  const { client, account } = useAmplop();
  const mine = useAsync(() => (account ? client.hajatanOf(account) : Promise.resolve([])), [account]);
  const latest = mine.data?.[mine.data.length - 1];
  return (
    <>
      <Hero />
      <div className="landing-doors">
        {latest && <a className="btn story-entry" href={link.buku(latest.token_id)}>{latest.title} ↗</a>}
        <a className="btn story-entry" href={link.coba()} data-tip={t.tipStory}>{t.cobaStart} ↗</a>
      </div>
    </>
  );
}
