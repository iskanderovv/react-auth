import { useState } from 'react';
import { useAuth } from '@/features/session/useAuth';
import { PROVIDER_NAMES, type Provider } from '@/shared/api/types';
import { ProviderIcon } from '@/shared/ui/ProviderIcon';

export function ProviderLink({ provider }: { provider: Provider }) {
  const { client } = useAuth();
  const [pending, setPending] = useState(false);

  return (
    <a
      className={`provider${pending ? ' busy' : ''}`}
      href={client.loginUrl(provider)}
      onClick={() => setPending(true)}
    >
      <ProviderIcon provider={provider} />
      Continue with {PROVIDER_NAMES[provider]}
    </a>
  );
}
