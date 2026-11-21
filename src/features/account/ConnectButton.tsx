import { useAuth } from '@/features/session/useAuth';
import { PROVIDER_NAMES, type Provider } from '@/shared/api/types';
import { useBusy } from '@/shared/lib/useBusy';

export function ConnectButton({ provider }: { provider: Provider }) {
  const { connect } = useAuth();
  const [busy, run] = useBusy();

  return (
    <button
      type="button"
      className={`small primary${busy ? ' busy' : ''}`}
      aria-label={`Connect ${PROVIDER_NAMES[provider]}`}
      aria-busy={busy || undefined}
      onClick={() => run(() => connect(provider))}
    >
      {busy ? 'Connecting…' : 'Connect'}
    </button>
  );
}
