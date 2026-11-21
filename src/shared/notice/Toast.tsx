import { useNotice } from '@/shared/notice/useNotice';

export function Toast() {
  const { notice, dismiss } = useNotice();

  return (
    <div id="toast" role="status" aria-live="polite">
      {notice && (
        <div className={`toast ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : undefined}>
          <span>{notice.text}</span>
          <button type="button" aria-label="Dismiss" onClick={dismiss}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
