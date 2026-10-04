import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CustomerInfo } from 'react-native-purchases';
import * as account from './account';
import * as purchases from './purchases';

type Session = {
  ready: boolean;
  user: account.Account | null;
  plus: boolean;
  customerInfo: CustomerInfo | null;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string, code: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setCustomerInfo: (info: CustomerInfo | null) => void;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<account.Account | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  useEffect(() => {
    let unsubscribe = () => undefined as void;
    (async () => {
      const current = account.accountsAvailable() ? await account.loadAccount() : null;
      setUser(current);
      purchases.configurePurchases(current?.id);
      setCustomerInfo(await purchases.getCustomerInfo());
      unsubscribe = purchases.onCustomerInfo(setCustomerInfo);
      setReady(true);
    })();
    return () => unsubscribe();
  }, []);

  const afterAuth = useCallback(async (next: account.Account) => {
    setUser(next);
    // Moves any purchase made before signing in onto the account. Runs in the background so a slow
    // or unreachable RevenueCat can never leave the sign-in button spinning.
    purchases.linkAccount(next.id).then((info) => { if (info) setCustomerInfo(info); }).catch(() => undefined);
  }, []);

  const value = useMemo<Session>(() => ({
    ready,
    user,
    plus: purchases.isPlus(customerInfo),
    customerInfo,
    signUp: async (email, password, name) => afterAuth(await account.signUp(email, password, name)),
    signIn: async (email, password) => afterAuth(await account.signIn(email, password)),
    resetPassword: async (email, code, password) => afterAuth(await account.resetPassword(email, code, password)),
    signOut: async () => {
      await account.signOut();
      setUser(null);
      setCustomerInfo(await purchases.unlinkAccount());
    },
    deleteAccount: async () => {
      await account.deleteAccount();
      setUser(null);
      setCustomerInfo(await purchases.unlinkAccount());
    },
    setCustomerInfo,
  }), [ready, user, customerInfo, afterAuth]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside SessionProvider');
  return session;
}
