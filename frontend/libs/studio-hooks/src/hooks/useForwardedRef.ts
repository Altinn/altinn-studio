import type { ForwardedRef, MutableRefObject } from 'react';
import { useImperativeHandle, useRef } from 'react';

export function useForwardedRef<T>(forwardedRef: ForwardedRef<T>): MutableRefObject<T | null> {
  const internalRef = useRef<T | null>(null);
  useImperativeHandle<T | null, T | null>(forwardedRef, () => internalRef.current, []);
  return internalRef;
}
}
