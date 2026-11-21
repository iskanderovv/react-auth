const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function initialOf(name: string): string {
  return (name || '?').trim().charAt(0).toUpperCase();
}

export function memberSince(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `Member since ${date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
}
