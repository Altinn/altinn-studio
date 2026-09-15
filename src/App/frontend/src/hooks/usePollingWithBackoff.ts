import { useEffect, useRef, useSyncExternalStore } from 'react';

import { queryFocusManager } from 'src/core/queries/focusManager';
const INITIAL_INTERVAL_MS = 1000;
const INITIAL_ATTEMPTS = 10;
const INTERVAL_INCREMENT_MS = 1000;
const MAX_INTERVAL_MS = 30_000;

export function getPollingInterval(attempt: number) {
  if (attempt < INITIAL_ATTEMPTS) {
    return INITIAL_INTERVAL_MS;
  }

  return Math.min(MAX_INTERVAL_MS, INITIAL_INTERVAL_MS + (attempt - INITIAL_ATTEMPTS + 1) * INTERVAL_INCREMENT_MS);
}

/**
 * Polls quickly at first, then gradually reduces the request rate during a long wait. Polling
 * pauses in background tabs and resumes immediately when the tab becomes active again.
 *
 * The callback must handle its own errors. Each invocation finishes before the next one is
 * scheduled, so a slow request can never cause overlapping calls.
 */
export function usePollingWithBackoff(callback: () => Promise<unknown>, enabled = true) {
  const callbackRef = useRef(callback);
  const attemptsRef = useRef(0);
  const wasPausedRef = useRef(false);
  const isFocused = useSyncExternalStore(
    (onStoreChange) => queryFocusManager.subscribe(onStoreChange),
    () => queryFocusManager.isFocused(),
    () => true,
  );

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      attemptsRef.current = 0;
      wasPausedRef.current = false;
      return;
    }

    if (!isFocused) {
      wasPausedRef.current = true;
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const scheduleNext = (delay: number) => {
      timeoutId = setTimeout(async () => {
        await callbackRef.current();
        if (cancelled) {
          return;
        }

        attemptsRef.current++;
        scheduleNext(getPollingInterval(attemptsRef.current));
      }, delay);
    };

    scheduleNext(wasPausedRef.current ? 0 : getPollingInterval(attemptsRef.current));
    wasPausedRef.current = false;

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [enabled, isFocused]);
}
