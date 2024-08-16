import type { ForwardedRef, MutableRefObject } from 'react';
import { useImperativeHandle, useRef } from 'react';

export function useForwardedRef<T>(forwardedRef: ForwardedRef<T>): MutableRefObject<T> {
  const internalRef = useRef<T>();
  useImperativeHandle<T, T>(forwardedRef, () => internalRef.current, []);
  return internalRef;
}
