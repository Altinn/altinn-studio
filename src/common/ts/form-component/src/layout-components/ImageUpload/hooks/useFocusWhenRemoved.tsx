import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export function useFocusWhenRemoved<T>(
  value: T | null | undefined,
  elementRef: RefObject<HTMLElement | null>,
) {
  const prevValueRef = useRef<T | null | undefined>(value);

  useEffect(() => {
    const hadValueBefore = !!prevValueRef.current;
    const hasValueNow = !!value;
    const wasRemoved = hadValueBefore && !hasValueNow;

    if (wasRemoved) {
      requestAnimationFrame(() => {
        elementRef.current?.focus();
      });
    }

    prevValueRef.current = value;
  }, [value, elementRef]);
}
