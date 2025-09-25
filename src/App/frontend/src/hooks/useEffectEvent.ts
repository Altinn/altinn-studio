import { useCallback, useInsertionEffect, useRef } from 'react';

/**
 * This is a polyfill for the not yet released useEffectEvent hook,
 * use at your own risk :)
 * @see https://react.dev/learn/separating-events-from-effects#declaring-an-effect-event
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEffectEvent<T extends (...args: any[]) => any>(event: T) {
  const ref = useRef(event);
  useInsertionEffect(() => {
    ref.current = event;
  }, [event]);
  return useCallback((...args: Parameters<T>): ReturnType<T> => ref.current(...args), []);
}
