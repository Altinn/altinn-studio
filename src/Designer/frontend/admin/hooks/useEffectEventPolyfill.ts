import { useInsertionEffect, useRef } from 'react';

export function useEffectEventPolyfill<T extends (...args: any[]) => any>(event: T) {
  const ref = useRef(event);

  useInsertionEffect(() => {
    ref.current = event;
  }, [event]);

  return useRef((...args: Parameters<T>): ReturnType<T> => ref.current(...args)).current;
}
