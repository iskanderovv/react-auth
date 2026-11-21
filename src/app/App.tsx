import { useEffect, useRef, useState } from 'react';
import { PROVIDER_NAMES, type Provider } from '@/shared/api/types';
import { useAuth } from '@/features/session/useAuth';
import { Toast } from '@/shared/notice/Toast';
import { messageFor } from '@/shared/lib/messages';
import { useNotice } from '@/shared/notice/useNotice';
import { AccountPage } from '@/features/account/AccountPage';
import { SignInPage } from '@/features/sign-in/SignInPage';

interface Landing {
  error: string | null;
  linked: string | null;
  fromCallback: boolean;
}

function readLanding(): Landing {
  const params = new URLSearchParams(window.location.search);
  return {
    error: params.get('error'),
    linked: params.get('linked'),
    fromCallback: window.location.pathname === '/auth/callback',
  };
}

function providerName(id: string): string {
  return PROVIDER_NAMES[id as Provider] ?? id;
}

export function App() {
  const { client, status, user } = useAuth();
  const { show } = useNotice();
  const [landing] = useState(readLanding);
  const announced = useRef(false);

  useEffect(() => {
    if (window.location.pathname !== '/' || window.location.search) {
      window.history.replaceState(null, '', '/');
    }
  }, []);

  useEffect(() => {
    if (status === 'loading' || announced.current) {
      return;
    }
    announced.current = true;
    if (landing.error) {
      show('error', messageFor(landing.error));
    } else if (landing.linked) {
      show('ok', `${providerName(landing.linked)} connected.`);
    } else if (status === 'signedIn' && landing.fromCallback && user) {
      show('ok', `Welcome, ${user.name}.`);
    }
  }, [status, user, landing, show]);

  let content;
  if (status === 'loading') {
    content = (
      <div className="loading">
        <div className="spinner" role="progressbar" aria-label="Loading" />
      </div>
    );
  } else if (status === 'signedIn' && user) {
    content = <AccountPage user={user} />;
  } else {
    content = <SignInPage />;
  }

  return (
    <main className="page">
      <Toast />
      <div className="card">{content}</div>
      <p className="footer">
        <a href={client.docsUrl()} target="_blank" rel="noopener noreferrer">
          API documentation
        </a>
      </p>
    </main>
  );
}
