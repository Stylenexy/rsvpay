import { useMemo } from 'react';
import { createClient } from './chain';
import { AccountChip } from './components/parts';
import { AmplopProvider } from './context';
import { t } from './copy';
import { link, useRoute } from './lib/app';
import { Beranda } from './pages/Beranda';
import { Beri } from './pages/Beri';
import { Buka } from './pages/Buka';
import { Buku } from './pages/Buku';

function Page() {
  const route = useRoute();
  switch (route.name) {
    case 'beranda':
      return <Beranda />;
    case 'buka':
      return <Buka />;
    case 'beri':
      return <Beri key={route.id} id={route.id} />;
    case 'buku':
      return <Buku key={route.id} id={route.id} />;
    default:
      return (
        <main>
          <h1 className="hd">{t.notFound.title}</h1>
          <a className="btn" href={link.beranda()}>
            {t.notFound.back}
          </a>
        </main>
      );
  }
}

export function App() {
  const client = useMemo(() => createClient(), []);
  return (
    <AmplopProvider client={client}>
      <div className="app">
        <header className="topbar">
          <a className="brand" href={link.beranda()}>
            {t.appName}
          </a>
          <AccountChip />
        </header>
        <Page />
        <p className="note">{client.mode === 'mock' ? 'Mode tiruan (?mock): tidak menyentuh jaringan.' : t.testnetNote}</p>
      </div>
    </AmplopProvider>
  );
}
