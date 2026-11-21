import { createContext } from 'react';
import type { ApiClient } from '@/shared/api/client';
import type { Provider, User } from '@/shared/api/types';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthContextValue {
  client: ApiClient;
  status: AuthStatus;
  user: User | null;
  signOut: () => Promise<void>;
  connect: (provider: Provider) => Promise<void>;
  disconnect: (provider: Provider) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
