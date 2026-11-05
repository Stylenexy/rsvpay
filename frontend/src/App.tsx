import { useMemo } from 'react';
import { createClient } from './chain';
import { PointerTip, TourCard } from './components/Guide';
import { AccountChip, LanguageSwitcher, Sky } from './components/parts';
import { AmplopProvider } from './context';
import { useCopy } from './copy';
import { link, useRoute } from './lib/app';
import { Beranda } from './pages/Beranda';
import { Beri } from './pages/Beri';
import { Buka } from './pages/Buka';
import { Buku } from './pages/Buku';
import { Coba } from './pages/Coba';
import { Logo } from './hero/Logo';

function Page() {
  const t = useCopy();
  const route = useRoute();
  switch (route.name) {
    case 'coba':
      return <Coba />;
    case 'buka':
      return <Buka />;
    case 'beri':
      return <Beri key={route.id} id={route.id} />;
    case 'buku':
      return <Buku key={route.id} id={route.id} />;
    default:
      return (
        <main className="not-found">
          <h1 className="hd">{t.notFoundTitle}</h1>
          <a className="btn" href={link.beranda()}>
            {t.notFoundBack}
          </a>
        </main>
      );
  }
}

/** The app shares the landing sky, with a twelve-column frame for the story and form. */
function Shell({ mode }: { mode: string }) {
  const t = useCopy();
  const route = useRoute();
  if (route.name === 'beranda') return <Beranda />;
  return (
    <div className="app">
      <Sky langit={route.name === 'beri' ? 'fajar' : route.name === 'buku' || route.name === 'coba' ? 'malam' : 'senja'} />
      <header className="topbar">
        <a className="brand" href={link.beranda()}>
          <Logo className="brand-mark" />{t.appName}
        </a>
        <div className="header-tools"><LanguageSwitcher />{route.name !== 'coba' && <AccountChip />}</div>
      </header>
      <Page />
      <p className="note">{mode === 'mock' ? t.mockNote : t.testnetNote}</p>
    </div>
  );
}

export function App() {
  const client = useMemo(() => createClient(), []);
  return (
    <AmplopProvider client={client}>
      <Shell mode={client.mode} />
      <PointerTip />
      <TourCard />
    </AmplopProvider>
  );
}
