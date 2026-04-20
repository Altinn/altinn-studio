import { useRef, useEffect } from 'react';
import type { RefObject } from 'react';

// Scroll `elementRef` into view when any item in `dependencyArray` changes
export function useScrollIntoView(dependencyArray: unknown[]): RefObject<HTMLDivElement> {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (elementRef.current) {
      elementRef.current.scrollIntoView?.({ behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencyArray]);

  return elementRef;
}
