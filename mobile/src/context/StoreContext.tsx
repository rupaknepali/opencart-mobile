import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { setCurrency as persistCurrency, setSessionToken } from '../api/client';
import type { Customer, InitData } from '../api/types';

type StoreContextValue = {
  init: InitData | null;
  loading: boolean;
  error: string | null;
  customer: Customer | null;
  isLoggedIn: boolean;
  reload: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setCustomer: (customer: Customer | null) => void;
  changeCurrency: (code: string) => Promise<void>;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [init, setInit] = useState<InitData | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Fetch init data without touching the loading state (used on start-up and for silent refreshes). */
  const load = useCallback(
    () =>
      api.common
        .init()
        // First launch: keep the session the server created for us.
        .then((data) => setSessionToken(data.session_token).then(() => data))
        .then((data) => {
          setInit(data);
          setCustomer(data.customer);
          setError(null);
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not connect to the store.'))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  /** "Try again" on the boot screen: show the spinner again while retrying. */
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    await load();
  }, [load]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { customer: c } = await api.account.login(email, password);
      setCustomer(c);
      // Prices, cart (merged with the account cart) and wishlist may all change after login.
      await queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await api.account.logout();
    } finally {
      setCustomer(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const changeCurrency = useCallback(
    async (code: string) => {
      await persistCurrency(code);
      await load();
      await queryClient.invalidateQueries();
    },
    [queryClient, load],
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      init,
      loading,
      error,
      customer,
      isLoggedIn: !!customer,
      reload,
      login,
      logout,
      setCustomer,
      changeCurrency,
    }),
    [init, loading, error, customer, reload, login, logout, changeCurrency],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
