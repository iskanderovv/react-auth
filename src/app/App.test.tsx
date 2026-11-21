import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/app/App';
import { ApiClient } from '@/shared/api/client';
import type { User } from '@/shared/api/types';
import { AuthProvider } from '@/features/session/AuthProvider';
import { EMAIL_UNAVAILABLE } from '@/features/sign-in/copy';
import { messageFor } from '@/shared/lib/messages';
import { NoticeProvider } from '@/shared/notice/NoticeProvider';

const BASE = 'https://api.example.com';

const ali: User = {
  id: '3f0c1c9e-6f0d-4c37-8d4e-0d7a9e2b1a11',
  name: 'Ali Valiyev',
  email: 'ali@example.com',
  avatarUrl: null,
  providers: ['google', 'telegram'],
  createdAt: '2026-11-21T09:00:00Z',
};

interface Recorded {
  method: string;
  path: string;
  headers: Record<string, string>;
}

type Route = (request: Recorded) => Response;

function json(status: number, body: unknown = null): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function fakeServer(routes: Record<string, Route>) {
  const calls: Recorded[] = [];
  const fetchFn = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    const request: Recorded = {
      method: init?.method ?? 'GET',
      path: url.pathname,
      headers: (init?.headers ?? {}) as Record<string, string>,
    };
    calls.push(request);
    const route = routes[`${request.method} ${request.path}`];
    if (!route) {
      return json(404, { error: { code: 'not_found' } });
    }
    return route(request);
  });
  return {
    fetchFn,
    calls,
    count: (key: string) => calls.filter((c) => `${c.method} ${c.path}` === key).length,
  };
}

const signedOut = { 'POST /auth/refresh': () => json(401, { error: { code: 'refresh_missing' } }) };

function signedIn(user: User = ali, extra: Record<string, Route> = {}) {
  return {
    'POST /auth/refresh': () => json(200, { accessToken: 'access-1', expiresIn: 900 }),
    'GET /me': () => json(200, user),
    ...extra,
  };
}

function mount(server: ReturnType<typeof fakeServer>, { strict = false } = {}) {
  const navigate = vi.fn();
  const client = new ApiClient(BASE, server.fetchFn);
  const tree = (
    <NoticeProvider>
      <AuthProvider client={client} navigate={navigate}>
        <App />
      </AuthProvider>
    </NoticeProvider>
  );
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  return { navigate, client };
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('signed out', () => {
  it('shows the sign in form with the email field and the three providers', async () => {
    mount(fakeServer(signedOut));

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with email' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Continue with Google/ })).toHaveAttribute(
      'href',
      `${BASE}/auth/google`,
    );
    expect(screen.getByRole('link', { name: /Continue with Facebook/ })).toHaveAttribute(
      'href',
      `${BASE}/auth/facebook`,
    );
    expect(screen.getByRole('link', { name: /Continue with Telegram/ })).toHaveAttribute(
      'href',
      `${BASE}/auth/telegram`,
    );
    expect(screen.getByRole('link', { name: 'API documentation' })).toHaveAttribute('href', `${BASE}/docs`);
    expect(document.title).toBe('Sign in · Alifco');
  });

  it('shows a loading indicator until the session check ends', async () => {
    let finish: (response: Response) => void = () => undefined;
    const server = fakeServer({
      'POST /auth/refresh': () => {
        throw new Error('replaced below');
      },
    });
    server.fetchFn.mockImplementationOnce(() => new Promise<Response>((resolve) => (finish = resolve)));
    mount(server);

    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeInTheDocument();
    finish(json(401, { error: { code: 'refresh_missing' } }));
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('validates the email and says that email sign in is not available yet', async () => {
    const server = fakeServer(signedOut);
    mount(server);
    const user = userEvent.setup();
    await screen.findByLabelText('Email');
    const submit = screen.getByRole('button', { name: 'Continue with email' });

    await user.click(submit);
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');

    await user.type(screen.getByLabelText('Email'), 'abc');
    expect(screen.queryByText('Enter your email address.')).not.toBeInTheDocument();
    await user.click(submit);
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'ali@example.com');
    await user.click(submit);
    expect(screen.getByText(EMAIL_UNAVAILABLE)).toBeInTheDocument();
    expect(server.calls.filter((c) => c.method === 'POST' && c.path !== '/auth/refresh')).toHaveLength(0);
  });

  it('switches between sign in and sign up', async () => {
    mount(fakeServer(signedOut));
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Welcome back' });

    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(document.title).toBe('Create account · Alifco');

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('marks a provider as busy once it is clicked', async () => {
    mount(fakeServer(signedOut));
    const user = userEvent.setup();
    const link = await screen.findByRole('link', { name: /Continue with Google/ });
    link.addEventListener('click', (event) => event.preventDefault());

    await user.click(link);

    expect(link).toHaveClass('busy');
  });
});

describe('session restore', () => {
  it('calls refresh exactly once even under StrictMode, because a second call would count as a stolen token', async () => {
    const server = fakeServer(signedIn());
    mount(server, { strict: true });

    expect(await screen.findByText('Ali Valiyev')).toBeInTheDocument();

    expect(server.count('POST /auth/refresh')).toBe(1);
  });
});

describe('search engine hints', () => {
  const robots = () => document.querySelector('meta[name="robots"]')?.getAttribute('content');

  it('lets the sign in page be indexed', async () => {
    mount(fakeServer(signedOut));
    await screen.findByRole('heading', { name: 'Welcome back' });

    expect(robots()).toContain('index, follow');
  });

  it('keeps a signed-in account page out of search results', async () => {
    mount(fakeServer(signedIn()));
    await screen.findByText('Ali Valiyev');

    expect(robots()).toBe('noindex, nofollow');
  });
});

describe('signed in', () => {
  it('shows the profile and which providers are connected', async () => {
    mount(fakeServer(signedIn()));

    expect(await screen.findByText('Ali Valiyev')).toBeInTheDocument();
    expect(screen.getByText('ali@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Member since/)).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disconnect Google' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Disconnect Telegram' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Connect Facebook' })).toBeInTheDocument();
    expect(screen.getAllByText('Connected')).toHaveLength(2);
    expect(screen.getByText('Not connected')).toBeInTheDocument();
    expect(document.title).toBe('Your account · Alifco');
  });

  it('sends the access token with /me', async () => {
    const server = fakeServer(signedIn());
    mount(server);

    await screen.findByText('Ali Valiyev');

    const me = server.calls.find((c) => c.path === '/me');
    expect(me?.headers.Authorization).toBe('Bearer access-1');
  });

  it('keeps the only remaining provider connected', async () => {
    mount(fakeServer(signedIn({ ...ali, providers: ['google'] })));

    const button = await screen.findByRole('button', { name: 'Disconnect Google' });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need at least one way to sign in');
  });

  it('shows the initial when the user has no picture, and when the picture fails to load', async () => {
    mount(fakeServer(signedIn({ ...ali, avatarUrl: 'https://img.example/expired.png' })));
    const image = await screen.findByRole('presentation');
    expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');

    image.dispatchEvent(new Event('error'));

    expect(await screen.findByText('A')).toBeInTheDocument();
  });

  it('asks for confirmation before disconnecting, then disconnects and reloads the profile', async () => {
    let providers = ali.providers;
    const server = fakeServer(
      signedIn(ali, {
        'GET /me': () => json(200, { ...ali, providers }),
        'DELETE /auth/link/telegram': () => {
          providers = ['google'];
          return json(204);
        },
      }),
    );
    mount(server);
    const user = userEvent.setup();
    const button = await screen.findByRole('button', { name: 'Disconnect Telegram' });

    await user.click(button);
    expect(button).toHaveTextContent('Are you sure?');
    expect(server.count('DELETE /auth/link/telegram')).toBe(0);

    await user.click(button);

    await waitFor(() => expect(screen.getByText('Telegram disconnected.')).toBeInTheDocument());
    const request = server.calls.find((c) => c.method === 'DELETE');
    expect(request?.headers.Authorization).toBe('Bearer access-1');
    expect(screen.getByRole('button', { name: 'Connect Telegram' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disconnect Google' })).toBeDisabled();
  });

  it('shows the server reason when disconnecting fails', async () => {
    const server = fakeServer(
      signedIn(ali, { 'DELETE /auth/link/telegram': () => json(409, { error: { code: 'last_identity' } }) }),
    );
    mount(server);
    const user = userEvent.setup();
    const button = await screen.findByRole('button', { name: 'Disconnect Telegram' });

    await user.click(button);
    await user.click(button);

    expect(await screen.findByText(messageFor('last_identity'))).toBeInTheDocument();
  });

  it('starts linking and navigates to the provider', async () => {
    const server = fakeServer(
      signedIn(ali, {
        'POST /auth/link/facebook': () => json(200, { url: 'https://facebook.example/dialog' }),
      }),
    );
    const { navigate } = mount(server);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Connect Facebook' }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('https://facebook.example/dialog'));
  });

  it('signs out, tells the server, and returns to the form', async () => {
    const server = fakeServer(signedIn(ali, { 'POST /auth/logout': () => json(204) }));
    mount(server);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByText('You have been signed out.')).toBeInTheDocument();
    expect(server.calls.find((c) => c.path === '/auth/logout')?.headers['X-Requested-With']).toBe('fetch');
  });
});

describe('landing from a provider redirect', () => {
  it('shows a friendly message for an error code and cleans the address bar', async () => {
    window.history.replaceState(null, '', '/auth/callback?error=identity_taken');
    mount(fakeServer(signedOut));

    expect(await screen.findByText(messageFor('identity_taken'))).toBeInTheDocument();
    expect(within(screen.getByRole('status')).getByRole('alert')).toHaveTextContent(
      messageFor('identity_taken'),
    );
    expect(window.location.pathname + window.location.search).toBe('/');
  });

  it('never prints an unknown code from the address bar', async () => {
    window.history.replaceState(null, '', '/auth/callback?error=%3Cb%3Ehack%3C/b%3E');
    mount(fakeServer(signedOut));

    expect(await screen.findByText(messageFor('internal_error'))).toBeInTheDocument();
    expect(screen.queryByText(/hack/)).not.toBeInTheDocument();
  });

  it('welcomes the user after a successful login', async () => {
    window.history.replaceState(null, '', '/auth/callback');
    mount(fakeServer(signedIn()));

    expect(await screen.findByText('Welcome, Ali Valiyev.')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('confirms a newly linked provider', async () => {
    window.history.replaceState(null, '', '/settings/accounts?linked=telegram');
    mount(fakeServer(signedIn()));

    expect(await screen.findByText('Telegram connected.')).toBeInTheDocument();
  });

  it('does not bring the landing message back after later changes', async () => {
    window.history.replaceState(null, '', '/settings/accounts?linked=telegram');
    let providers = ali.providers;
    const server = fakeServer(
      signedIn(ali, {
        'GET /me': () => json(200, { ...ali, providers }),
        'DELETE /auth/link/telegram': () => {
          providers = ['google'];
          return json(204);
        },
      }),
    );
    mount(server);
    const user = userEvent.setup();
    await screen.findByText('Telegram connected.');

    const button = screen.getByRole('button', { name: 'Disconnect Telegram' });
    await user.click(button);
    await user.click(button);

    await screen.findByText('Telegram disconnected.');
    expect(screen.queryByText('Telegram connected.')).not.toBeInTheDocument();
  });

  it('shows the toast only once', async () => {
    window.history.replaceState(null, '', '/auth/callback');
    mount(fakeServer(signedIn()), { strict: true });

    await screen.findByText('Welcome, Ali Valiyev.');

    const status = screen.getByRole('status');
    expect(within(status).getAllByText(/Welcome/)).toHaveLength(1);
  });

  it('lets the user dismiss a message', async () => {
    window.history.replaceState(null, '', '/auth/callback?error=access_denied');
    mount(fakeServer(signedOut));
    const user = userEvent.setup();
    await screen.findByText(messageFor('access_denied'));

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByText(messageFor('access_denied'))).not.toBeInTheDocument();
  });
});
