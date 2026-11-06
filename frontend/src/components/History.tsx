import type { Hajatan } from '../chain/types';
import { loadEnvelopeHistory, type HistoryEvent } from '../chain/history';
import { useAmplop } from '../context';
import { say, useCopy } from '../copy';
import { link, useAsync } from '../lib/app';
import { useFormat, useLang } from '../lib/lang';
import { chainRp } from '../lib/rupiah';
import { TxLink } from './parts';

export function History({ hajatan, revision }: { hajatan: Hajatan; revision: number }) {
  const { client } = useAmplop();
  const t = useCopy();
  const { locale } = useLang();
  const { formatRp } = useFormat();
  const history = useAsync(() => loadEnvelopeHistory(client, hajatan), [client, hajatan.token_id, hajatan.balance, hajatan.seed_locked, hajatan.owner_id, revision]);
  const labels = (e: HistoryEvent) => {
    const amount = formatRp(chainRp(e.amount ?? '0'));
    switch (e.kind) {
      case 'gift': return say(t.historyGift, e.from ?? '', amount);
      case 'replyIn': return say(t.historyReplyIn, amount);
      case 'replyOut': return say(t.historyReplyOut, amount);
      case 'holder': return say(t.historyHolder, e.from ?? '', e.to ?? '');
      case 'opened': return say(t.historyOpened, e.to ?? '');
      case 'paid': return say(t.historyPayout, amount);
      case 'refund': return say(t.historyRefund, amount);
    }
  };
  const data = history.data;
  return <section className="glass card envelope-history" aria-label={t.historyTitle}>
    <h2>{t.historyTitle}</h2>
    <p className="history-account">{say(t.historyCurrent, hajatan.owner_id)}</p>
    {history.loading && <p className="note" role="status">{t.loading}</p>}
    {data && <>
      <p>{say(t.historyEarned, formatRp(chainRp(data.earned)))}</p>
      {data.paid !== null && <p>{say(t.historyPaid, formatRp(chainRp(data.paid)))}</p>}
      {data.coverage !== 'indexed' && <p className="note">{data.coverage === 'partial' ? t.historyPartial : t.historyUnknown}</p>}
      <ol className="history-timeline">{data.events.map((e) => <li key={e.id}>
        {e.at && <time dateTime={new Date(Number(BigInt(e.at) / 1_000_000n)).toISOString()}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(Number(BigInt(e.at) / 1_000_000n)))}</time>}
        <p>{labels(e)}</p>
        {e.peer && <a className="text-link" href={link.buku(e.peer)}>{t.historyRelated} ↗</a>}
        <TxLink hash={e.hash} />
      </li>)}</ol>
    </>}
    {history.error && <p className="note" role="status">{t.historyUnknown}</p>}
  </section>;
}
