import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export function useFocusOnChange<T>(
  value: T | null | undefined,
  elementRef: RefObject<HTMLElement | null>,
  isEnabled = true,
) {
  const prevValueRef = useRef<T | null | undefined>(value);

  useEffect(() => {
    const hasChanged: boolean = Boolean(value && value !== prevValueRef.current);

    if (hasChanged && isEnabled) {
      requestAnimationFrame(() => {
        elementRef.current?.focus();
      });
    }

    prevValueRef.current = value;
  });
}
