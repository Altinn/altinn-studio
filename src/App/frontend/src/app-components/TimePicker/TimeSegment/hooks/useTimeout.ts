import { useCallback, useEffect, useRef } from 'react';

export function useTimeout(callback: () => void, delayMs: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedCallback = useRef(callback);

  // Keep callback fresh to avoid stale closures
  useEffect(() => {
    savedCallback.current = callback;
  });

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clear();
    timeoutRef.current = setTimeout(() => {
      savedCallback.current();
    }, delayMs);
  }, [clear, delayMs]);

  // Clean up on unmount
  useEffect(() => clear, [clear]);

  // Return stable object reference
  const stableControls = useRef({ start, clear });
  stableControls.current.start = start;
  stableControls.current.clear = clear;

  return stableControls.current;
}
