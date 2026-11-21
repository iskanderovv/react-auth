import { createContext } from 'react';

export type NoticeKind = 'ok' | 'error' | 'info';

export interface Notice {
  kind: NoticeKind;
  text: string;
}

export interface NoticeContextValue {
  notice: Notice | null;
  show: (kind: NoticeKind, text: string) => void;
  dismiss: () => void;
}

export const NoticeContext = createContext<NoticeContextValue | null>(null);
