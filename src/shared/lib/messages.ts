const MESSAGES: Record<string, string> = {
  access_denied: 'Sign-in was cancelled. Nothing was changed.',
  invalid_state: 'That sign-in link has expired. Please try again.',
  provider_error: 'We could not finish signing you in. Please try again.',
  internal_error: 'Something went wrong on our side. Please try again.',
  identity_taken: 'That account already has its own profile. Sign in with it to use that profile.',
  already_linked: 'That account is already connected.',
  last_identity: 'You need at least one way to sign in, so the last one cannot be removed.',
  not_linked: 'That account is not connected.',
  provider_not_found: 'That sign-in option is not available right now.',
  token_missing: 'Your session has ended. Please sign in again.',
  token_invalid: 'Your session has ended. Please sign in again.',
  rate_limited: 'Too many attempts. Please wait a minute and try again.',
};

export function messageFor(code: string | null | undefined): string {
  return (code && MESSAGES[code]) || MESSAGES.internal_error;
}
