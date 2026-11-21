import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ApiClient } from '@/shared/api/client';
import { PROVIDER_NAMES, type Provider, type User } from '@/shared/api/types';
import { messageFor } from '@/shared/lib/messages';
import { useNotice } from '@/shared/notice/useNotice';
import { AuthContext, type AuthStatus } from '@/features/session/context';

function redirect(url: string) {
  window.location.assign(url);
}

interface AuthProviderProps {
  client: ApiClient;
  navigate?: (url: string) => void;
  children: ReactNode;
}

export function AuthProvider({ client, navigate = redirect, children }: AuthProviderProps) {
  const { show, dismiss } = useNotice();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restored = (await client.refresh()) && (await client.me());
      if (cancelled) {
        return;
      }
      setUser(restored || null);
      setStatus(restored ? 'signedIn' : 'signedOut');
    })();
    return () => {
      cancelled = true;
    };
  }, [client]);

  const signOut = useCallback(async () => {
    await client.logout();
    setUser(null);
    setStatus('signedOut');
    show('info', 'You have been signed out.');
  }, [client, show]);

  const connect = useCallback(
    async (provider: Provider) => {
      const result = await client.startLink(provider);
      if (result.ok && result.body) {
        navigate(result.body.url);
        return;
      }
      show('error', messageFor(result.code));
    },
    [client, show, navigate],
  );

  const disconnect = useCallback(
    async (provider: Provider) => {
      dismiss();
      const result = await client.unlink(provider);
      if (!result.ok) {
        show('error', messageFor(result.code));
        return;
      }
      const refreshed = await client.me();
      if (refreshed) {
        setUser(refreshed);
      }
      show('ok', `${PROVIDER_NAMES[provider]} disconnected.`);
    },
    [client, show, dismiss],
  );

  const value = useMemo(
    () => ({ client, status, user, signOut, connect, disconnect }),
    [client, status, user, signOut, connect, disconnect],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
