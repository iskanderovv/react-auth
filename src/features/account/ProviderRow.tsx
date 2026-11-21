import { PROVIDER_NAMES, type Provider } from '@/shared/api/types';
import { ProviderIcon } from '@/shared/ui/ProviderIcon';
import { ConnectButton } from './ConnectButton';
import { DisconnectButton } from './DisconnectButton';

interface ProviderRowProps {
  provider: Provider;
  connected: boolean;
  lastOne: boolean;
}

export function ProviderRow({ provider, connected, lastOne }: ProviderRowProps) {
  return (
    <div className="row">
      <ProviderIcon provider={provider} />
      <div className="info">
        <span className="label">{PROVIDER_NAMES[provider]}</span>
        <span className={`state${connected ? '' : ' off'}`}>{connected ? 'Connected' : 'Not connected'}</span>
      </div>
      {connected ? (
        <DisconnectButton provider={provider} disabled={lastOne} />
      ) : (
        <ConnectButton provider={provider} />
      )}
    </div>
  );
}
