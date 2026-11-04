import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AccountId, AmplopClient } from './chain/types';

interface Ctx {
  client: AmplopClient;
  account: AccountId | null;
  /** re-read the active account after the client changed it (create, switch) */
  refresh: () => void;
  switchTo: (id: AccountId) => void;
}

const AmplopContext = createContext<Ctx | null>(null);

export function AmplopProvider({ client, children }: { client: AmplopClient; children: ReactNode }) {
  const [account, setAccount] = useState<AccountId | null>(() => client.account());
  const refresh = useCallback(() => setAccount(client.account()), [client]);
  const switchTo = useCallback(
    (id: AccountId) => {
      client.useAccount(id);
      setAccount(client.account());
    },
    [client],
  );
  const value = useMemo(() => ({ client, account, refresh, switchTo }), [client, account, refresh, switchTo]);
  return <AmplopContext.Provider value={value}>{children}</AmplopContext.Provider>;
}

export function useAmplop(): Ctx {
  const v = useContext(AmplopContext);
  if (!v) throw new Error('AmplopProvider is missing');
  return v;
}
