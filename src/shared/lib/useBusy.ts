import { useCallback, useEffect, useRef, useState } from 'react';

export function useBusy(): [boolean, (work: () => Promise<void>) => Promise<void>] {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  }, []);

  return [busy, run];
}
