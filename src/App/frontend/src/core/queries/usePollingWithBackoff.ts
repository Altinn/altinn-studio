import { useEffect, useRef, useSyncExternalStore } from 'react';

import { queryFocusManager } from 'src/core/queries/focusManager';
const DEFAULT_INITIAL_INTERVAL_MS = 1000;
const DEFAULT_INITIAL_ATTEMPTS = 10;
const INTERVAL_INCREMENT_MS = 1000;
const MAX_INTERVAL_MS = 30_000;

type PollingOptions = {
  initialIntervalMs?: number;
  initialAttempts?: number;
};

export function getPollingInterval(
  attempt: number,
  initialIntervalMs = DEFAULT_INITIAL_INTERVAL_MS,
  initialAttempts = DEFAULT_INITIAL_ATTEMPTS,
) {
  if (attempt < initialAttempts) {
    return initialIntervalMs;
  }

  return Math.min(MAX_INTERVAL_MS, initialIntervalMs + (attempt - initialAttempts + 1) * INTERVAL_INCREMENT_MS);
}

/**
 * Polls quickly at first, then gradually reduces the request rate during a long wait. Polling
 * pauses in background tabs and resumes immediately when the tab becomes active again.
 *
 * The callback must handle its own errors. Each invocation finishes before the next one is
 * scheduled, so a slow request can never cause overlapping calls.
 */
export function usePollingWithBackoff(
  callback: () => Promise<unknown>,
  enabled = true,
  { initialIntervalMs = DEFAULT_INITIAL_INTERVAL_MS, initialAttempts = DEFAULT_INITIAL_ATTEMPTS }: PollingOptions = {},
) {
  const callbackRef = useRef(callback);
  const activeCallbackRef = useRef<Promise<unknown> | undefined>(undefined);
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
        // An earlier effect may still have a request in flight after losing focus or being disabled.
        await activeCallbackRef.current;
        if (cancelled) {
          return;
        }

        const activeCallback = callbackRef.current();
        activeCallbackRef.current = activeCallback;
        try {
          await activeCallback;
        } finally {
          if (activeCallbackRef.current === activeCallback) {
            activeCallbackRef.current = undefined;
          }
        }
        if (cancelled) {
          return;
        }

        attemptsRef.current++;
        scheduleNext(getPollingInterval(attemptsRef.current, initialIntervalMs, initialAttempts));
      }, delay);
    };

    scheduleNext(
      wasPausedRef.current ? 0 : getPollingInterval(attemptsRef.current, initialIntervalMs, initialAttempts),
    );
    wasPausedRef.current = false;

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [enabled, isFocused, initialIntervalMs, initialAttempts]);
}
