import type { ApiResponse, Provider, RequestOptions, User } from '@/shared/api/types';

type FetchFn = typeof fetch;

interface ErrorBody {
  error?: { code?: string };
}

export class ApiClient {
  private token: string | null = null;
  private refreshing: Promise<boolean> | null = null;
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFn;

  constructor(baseUrl: string, fetchFn: FetchFn = (input, init) => fetch(input, init)) {
    this.baseUrl = baseUrl;
    this.fetchFn = fetchFn;
  }

  loginUrl(provider: Provider): string {
    return `${this.baseUrl}/auth/${provider}`;
  }

  docsUrl(): string {
    return `${this.baseUrl}/docs`;
  }

  hasToken(): boolean {
    return this.token !== null;
  }

  async request<T>(
    method: string,
    path: string,
    { auth = false, csrf = false, retry = true }: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {};
    if (auth && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    if (csrf) {
      headers['X-Requested-With'] = 'fetch';
    }

    const response = await this.fetchFn(this.baseUrl + path, {
      method,
      headers,
      credentials: 'include',
    });
    const body = (await response.json().catch(() => null)) as (T & ErrorBody) | null;
    const code = body?.error?.code ?? null;

    if (auth && retry && response.status === 401 && code === 'token_expired' && (await this.refresh())) {
      return this.request<T>(method, path, { auth, csrf, retry: false });
    }
    return { ok: response.ok, status: response.status, body, code };
  }

  refresh(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = this.request<{ accessToken: string }>('POST', '/auth/refresh', { csrf: true })
        .then((result) => {
          this.token = result.ok && result.body ? result.body.accessToken : null;
          return result.ok;
        })
        .catch(() => {
          this.token = null;
          return false;
        })
        .finally(() => {
          this.refreshing = null;
        });
    }
    return this.refreshing;
  }

  async me(): Promise<User | null> {
    const result = await this.request<User>('GET', '/me', { auth: true });
    return result.ok ? result.body : null;
  }

  async startLink(provider: Provider): Promise<ApiResponse<{ url: string }>> {
    if (!this.token && !(await this.refresh())) {
      return { ok: false, status: 401, body: null, code: 'token_missing' };
    }
    return this.request<{ url: string }>('POST', `/auth/link/${provider}`, { auth: true });
  }

  unlink(provider: Provider): Promise<ApiResponse<null>> {
    return this.request<null>('DELETE', `/auth/link/${provider}`, { auth: true });
  }

  async logout(): Promise<void> {
    await this.request<null>('POST', '/auth/logout', { csrf: true }).catch(() => undefined);
    this.token = null;
  }
}
