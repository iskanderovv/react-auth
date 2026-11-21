import { useId, useState, type FormEvent } from 'react';
import { isEmail } from '@/shared/lib/format';

interface EmailFormProps {
  submitLabel: string;
  onValid: (email: string) => void;
}

export function EmailForm({ submitLabel, onValid }: EmailFormProps) {
  const id = useId();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    const email = value.trim();
    if (!isEmail(email)) {
      setError(email ? 'Enter a valid email address.' : 'Enter your email address.');
      return;
    }
    onValid(email);
  }

  return (
    <form noValidate onSubmit={submit}>
      <div className="field">
        <label htmlFor={`${id}-email`}>Email</label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-error`}
          onChange={(event) => {
            setValue(event.target.value);
            setError('');
          }}
        />
        <div className="error" id={`${id}-error`} role="alert">
          {error}
        </div>
      </div>
      <button type="submit" className="primary-button">
        {submitLabel}
      </button>
    </form>
  );
}
