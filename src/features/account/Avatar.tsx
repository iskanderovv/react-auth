import { useState } from 'react';
import type { User } from '@/shared/api/types';
import { initialOf } from '@/shared/lib/format';

export function Avatar({ user }: { user: User }) {
  const [failed, setFailed] = useState(false);

  if (!user.avatarUrl || failed) {
    return <div className="avatar">{initialOf(user.name)}</div>;
  }
  return (
    <img
      className="avatar"
      src={user.avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
