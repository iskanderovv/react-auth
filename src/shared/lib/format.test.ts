import { describe, expect, it } from 'vitest';
import { initialOf, isEmail, memberSince } from '@/shared/lib/format';
import { messageFor } from '@/shared/lib/messages';

describe('isEmail', () => {
  it('accepts ordinary addresses and ignores surrounding spaces', () => {
    expect(isEmail('ali@example.com')).toBe(true);
    expect(isEmail('  ali.v+tag@sub.example.co  ')).toBe(true);
  });

  it('rejects the rest', () => {
    for (const bad of ['', 'abc', 'a@b', 'a@b.c', '@example.com', 'a b@example.com', 'a@@example.com']) {
      expect(isEmail(bad), bad).toBe(false);
    }
  });
});

describe('initialOf', () => {
  it('uses the first letter in upper case and a placeholder for an empty name', () => {
    expect(initialOf('ali valiyev')).toBe('A');
    expect(initialOf('  zarina')).toBe('Z');
    expect(initialOf('')).toBe('?');
  });
});

describe('memberSince', () => {
  it('formats a date and stays empty for garbage', () => {
    expect(memberSince('2026-11-21T09:00:00Z')).toMatch(/^Member since .*2026/);
    expect(memberSince('not a date')).toBe('');
  });
});

describe('messageFor', () => {
  it('knows every code the server can put in a redirect', () => {
    for (const code of [
      'access_denied',
      'invalid_state',
      'provider_error',
      'internal_error',
      'identity_taken',
      'already_linked',
    ]) {
      expect(messageFor(code).length).toBeGreaterThan(10);
    }
  });

  it('falls back to a generic message for unknown or missing codes', () => {
    expect(messageFor('something_new')).toBe(messageFor('internal_error'));
    expect(messageFor(null)).toBe(messageFor('internal_error'));
  });

  it('never repeats provider detail: a code is mapped, not echoed', () => {
    expect(messageFor('<img src=x onerror=alert(1)>')).toBe(messageFor('internal_error'));
  });
});
