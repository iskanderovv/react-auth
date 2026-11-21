import { useAuth } from '@/features/session/useAuth';
import { PROVIDERS, type User } from '@/shared/api/types';
import { memberSince } from '@/shared/lib/format';
import { useBusy } from '@/shared/lib/useBusy';
import { usePageMeta } from '@/shared/lib/usePageMeta';
import { Avatar } from './Avatar';
import { ProviderRow } from './ProviderRow';

export function AccountPage({ user }: { user: User }) {
  const { signOut } = useAuth();
  const [signingOut, run] = useBusy();
  const linked = new Set(user.providers);
  const since = memberSince(user.createdAt);

  usePageMeta({ title: 'Your account', indexable: false });

  return (
    <>
      <div className="head">
        <Avatar user={user} />
        <div className="who">
          <div className="name">{user.name}</div>
          {user.email && <div className="email">{user.email}</div>}
          {since && <div className="since">{since}</div>}
        </div>
      </div>

      <h2>Connected accounts</h2>
      <p className="hint">Connect more accounts to sign in with any of them.</p>

      {PROVIDERS.map((provider) => (
        <ProviderRow
          key={provider}
          provider={provider}
          connected={linked.has(provider)}
          lastOne={linked.size <= 1}
        />
      ))}

      <button type="button" className={`signout${signingOut ? ' busy' : ''}`} onClick={() => run(signOut)}>
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </>
  );
}
