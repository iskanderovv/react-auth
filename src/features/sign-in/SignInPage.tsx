import { useState } from 'react';
import { PROVIDERS } from '@/shared/api/types';
import { usePageMeta } from '@/shared/lib/usePageMeta';
import { useNotice } from '@/shared/notice/useNotice';
import { COPY, EMAIL_UNAVAILABLE, type Mode } from './copy';
import { EmailForm } from './EmailForm';
import { ProviderLink } from './ProviderLink';

export function SignInPage() {
  const { show, dismiss } = useNotice();
  const [mode, setMode] = useState<Mode>('signin');
  const copy = COPY[mode];

  usePageMeta({ title: copy.documentTitle, indexable: true });

  return (
    <>
      <img className="brand" src="/icon-192.png" alt="Alifco" width={76} height={76} fetchPriority="high" />
      <h1>{copy.title}</h1>
      <p className="sub">{copy.sub}</p>

      <EmailForm submitLabel="Continue with email" onValid={() => show('info', EMAIL_UNAVAILABLE)} />

      <div className="divider" role="separator">
        or
      </div>

      {PROVIDERS.map((provider) => (
        <ProviderLink key={provider} provider={provider} />
      ))}

      <p className="switch">
        {copy.switchText}{' '}
        <button
          type="button"
          className="link"
          onClick={() => {
            dismiss();
            setMode(mode === 'signin' ? 'signup' : 'signin');
          }}
        >
          {copy.switchAction}
        </button>
      </p>
    </>
  );
}
