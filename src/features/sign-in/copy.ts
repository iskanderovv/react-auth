export type Mode = 'signin' | 'signup';

interface Copy {
  title: string;
  sub: string;
  switchText: string;
  switchAction: string;
  documentTitle: string;
}

export const COPY: Record<Mode, Copy> = {
  signin: {
    title: 'Welcome back',
    sub: 'Sign in to continue to Alifco',
    switchText: "Don't have an account?",
    switchAction: 'Sign up',
    documentTitle: 'Sign in',
  },
  signup: {
    title: 'Create your account',
    sub: 'Get started with Alifco in a minute',
    switchText: 'Already have an account?',
    switchAction: 'Sign in',
    documentTitle: 'Create account',
  },
};

export const EMAIL_UNAVAILABLE =
  'Signing in with email is not available yet. Please continue with one of the options below.';
