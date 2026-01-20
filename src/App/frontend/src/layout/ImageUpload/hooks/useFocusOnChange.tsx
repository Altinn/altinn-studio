import { useEffect, useRef } from 'react';
import type React from 'react';

export function useFocusOnChange<T>(
  value: T | null | undefined,
  elementRef: React.RefObject<HTMLElement | null>,
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
