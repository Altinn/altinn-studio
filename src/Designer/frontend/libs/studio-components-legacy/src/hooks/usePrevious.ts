import { useEffect, useRef } from 'react';

/**
 *@deprecated Use `usePrevious` from `studio-hooks` instead.
 */
export function usePrevious<T>(value: T) {
  const ref = useRef<T>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
