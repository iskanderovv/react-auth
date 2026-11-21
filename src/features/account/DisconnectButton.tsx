import { useEffect, useState } from 'react';
import { useAuth } from '@/features/session/useAuth';
import { PROVIDER_NAMES, type Provider } from '@/shared/api/types';
import { useBusy } from '@/shared/lib/useBusy';

const CONFIRM_WINDOW_MS = 4000;

export function DisconnectButton({ provider, disabled }: { provider: Provider; disabled: boolean }) {
  const { disconnect } = useAuth();
  const [busy, run] = useBusy();
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) {
      return;
    }
    const timer = setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  function click() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    run(() => disconnect(provider));
  }

  let label = 'Disconnect';
  if (busy) {
    label = 'Disconnecting…';
  } else if (armed) {
    label = 'Are you sure?';
  }

  return (
    <button
      type="button"
      className={`small${armed ? ' danger' : ''}${busy ? ' busy' : ''}`}
      disabled={disabled}
      title={disabled ? 'You need at least one way to sign in' : undefined}
      aria-label={`Disconnect ${PROVIDER_NAMES[provider]}`}
      aria-busy={busy || undefined}
      onClick={click}
    >
      {label}
    </button>
  );
}
