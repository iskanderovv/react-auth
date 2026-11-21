import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '@/shared/api/client';

const BASE = 'https://api.example.com';

function reply(status: number, body: unknown = null): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function setup(...responses: Array<Response | Error>) {
  const queue = [...responses];
  const fetchFn = vi.fn<typeof fetch>(async () => {
    const next = queue.shift();
    if (!next) {
      throw new Error('unexpected request');
    }
    if (next instanceof Error) {
      throw next;
    }
    return next;
  });
  return { client: new ApiClient(BASE, fetchFn), fetchFn };
}

function call(fetchFn: ReturnType<typeof setup>['fetchFn'], index: number) {
  const [url, init] = fetchFn.mock.calls[index];
  return { url: String(url), init: init as RequestInit, headers: init?.headers as Record<string, string> };
}

describe('ApiClient', () => {
  it('builds the login and docs urls from the base', () => {
    const { client } = setup();
    expect(client.loginUrl('google')).toBe(`${BASE}/auth/google`);
    expect(client.docsUrl()).toBe(`${BASE}/docs`);
  });

  describe('refresh', () => {
    it('sends the csrf header and the cookie, and keeps the access token', async () => {
      const { client, fetchFn } = setup(reply(200, { accessToken: 'abc', expiresIn: 900 }));

      expect(await client.refresh()).toBe(true);

      const request = call(fetchFn, 0);
      expect(request.url).toBe(`${BASE}/auth/refresh`);
      expect(request.init.method).toBe('POST');
      expect(request.init.credentials).toBe('include');
      expect(request.headers['X-Requested-With']).toBe('fetch');
      expect(client.hasToken()).toBe(true);
    });

    it('shares one request between concurrent callers', async () => {
      const { client, fetchFn } = setup(reply(200, { accessToken: 'abc', expiresIn: 900 }));

      const results = await Promise.all([client.refresh(), client.refresh(), client.refresh()]);

      expect(results).toEqual([true, true, true]);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('forgets the token on a refusal and can try again afterwards', async () => {
      const { client, fetchFn } = setup(
        reply(401, { error: { code: 'refresh_missing' } }),
        reply(200, { accessToken: 'second', expiresIn: 900 }),
      );

      expect(await client.refresh()).toBe(false);
      expect(client.hasToken()).toBe(false);
      expect(await client.refresh()).toBe(true);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('treats a network failure as signed out instead of throwing', async () => {
      const { client } = setup(new TypeError('Failed to fetch'));

      expect(await client.refresh()).toBe(false);
      expect(client.hasToken()).toBe(false);
    });
  });

  describe('request', () => {
    it('sends the bearer token only when asked and when there is one', async () => {
      const { client, fetchFn } = setup(
        reply(200, { accessToken: 'tok', expiresIn: 900 }),
        reply(200, { id: '1' }),
        reply(200, { status: 'ok' }),
      );
      await client.refresh();

      await client.request('GET', '/me', { auth: true });
      await client.request('GET', '/health');

      expect(call(fetchFn, 1).headers.Authorization).toBe('Bearer tok');
      expect(call(fetchFn, 2).headers.Authorization).toBeUndefined();
    });

    it('returns the error code from the body', async () => {
      const { client } = setup(reply(409, { error: { code: 'last_identity' } }));

      const result = await client.request('DELETE', '/auth/link/google', { auth: true });

      expect(result).toMatchObject({ ok: false, status: 409, code: 'last_identity' });
    });

    it('refreshes once and repeats the call when the access token has expired', async () => {
      const { client, fetchFn } = setup(
        reply(200, { accessToken: 'old', expiresIn: 900 }),
        reply(401, { error: { code: 'token_expired' } }),
        reply(200, { accessToken: 'new', expiresIn: 900 }),
        reply(200, { id: 'u1' }),
      );
      await client.refresh();

      const result = await client.request<{ id: string }>('GET', '/me', { auth: true });

      expect(result.ok).toBe(true);
      expect(result.body?.id).toBe('u1');
      expect(call(fetchFn, 2).url).toBe(`${BASE}/auth/refresh`);
      expect(call(fetchFn, 3).headers.Authorization).toBe('Bearer new');
    });

    it('does not loop when the repeated call is also refused', async () => {
      const { client, fetchFn } = setup(
        reply(200, { accessToken: 'old', expiresIn: 900 }),
        reply(401, { error: { code: 'token_expired' } }),
        reply(200, { accessToken: 'new', expiresIn: 900 }),
        reply(401, { error: { code: 'token_expired' } }),
      );
      await client.refresh();

      const result = await client.request('GET', '/me', { auth: true });

      expect(result.status).toBe(401);
      expect(fetchFn).toHaveBeenCalledTimes(4);
    });
  });

  describe('linking', () => {
    it('refreshes first when there is no token, and stops if that fails', async () => {
      const { client, fetchFn } = setup(reply(401, { error: { code: 'refresh_missing' } }));

      const result = await client.startLink('facebook');

      expect(result.code).toBe('token_missing');
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(call(fetchFn, 0).url).toBe(`${BASE}/auth/refresh`);
    });

    it('asks the server for the provider url', async () => {
      const { client, fetchFn } = setup(
        reply(200, { accessToken: 'tok', expiresIn: 900 }),
        reply(200, { url: 'https://provider.example/auth' }),
      );

      const result = await client.startLink('telegram');

      expect(result.body?.url).toBe('https://provider.example/auth');
      expect(call(fetchFn, 1).url).toBe(`${BASE}/auth/link/telegram`);
      expect(call(fetchFn, 1).init.method).toBe('POST');
    });

    it('unlinks with the bearer token', async () => {
      const { client, fetchFn } = setup(reply(200, { accessToken: 'tok', expiresIn: 900 }), reply(204));
      await client.refresh();

      const result = await client.unlink('google');

      expect(result.ok).toBe(true);
      expect(call(fetchFn, 1).init.method).toBe('DELETE');
      expect(call(fetchFn, 1).headers.Authorization).toBe('Bearer tok');
    });
  });

  describe('logout', () => {
    it('sends the csrf header and drops the token', async () => {
      const { client, fetchFn } = setup(reply(200, { accessToken: 'tok', expiresIn: 900 }), reply(204));
      await client.refresh();

      await client.logout();

      expect(call(fetchFn, 1).url).toBe(`${BASE}/auth/logout`);
      expect(call(fetchFn, 1).headers['X-Requested-With']).toBe('fetch');
      expect(client.hasToken()).toBe(false);
    });

    it('drops the token even when the request fails', async () => {
      const { client } = setup(reply(200, { accessToken: 'tok', expiresIn: 900 }), new TypeError('offline'));
      await client.refresh();

      await client.logout();

      expect(client.hasToken()).toBe(false);
    });
  });
});
