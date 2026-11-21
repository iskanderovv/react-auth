import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { NoticeContext, type Notice, type NoticeKind } from '@/shared/notice/context';

const AUTO_DISMISS_MS = 6000;

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);

  const show = useCallback((kind: NoticeKind, text: string) => setNotice({ kind, text }), []);
  const dismiss = useCallback(() => setNotice(null), []);

  useEffect(() => {
    if (!notice || notice.kind === 'error') {
      return;
    }
    const timer = setTimeout(() => setNotice(null), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const value = useMemo(() => ({ notice, show, dismiss }), [notice, show, dismiss]);
  return <NoticeContext.Provider value={value}>{children}</NoticeContext.Provider>;
}
