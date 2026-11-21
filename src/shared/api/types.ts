export const PROVIDERS = ['google', 'facebook', 'telegram'] as const;

export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_NAMES: Record<Provider, string> = {
  google: 'Google',
  facebook: 'Facebook',
  telegram: 'Telegram',
};

export interface User {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  providers: Provider[];
  createdAt: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  body: T | null;
  code: string | null;
}

export interface RequestOptions {
  auth?: boolean;
  csrf?: boolean;
  retry?: boolean;
}
