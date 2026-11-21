import { useContext } from 'react';
import { NoticeContext, type NoticeContextValue } from '@/shared/notice/context';

export function useNotice(): NoticeContextValue {
  const value = useContext(NoticeContext);
  if (!value) {
    throw new Error('useNotice must be used inside NoticeProvider');
  }
  return value;
}
