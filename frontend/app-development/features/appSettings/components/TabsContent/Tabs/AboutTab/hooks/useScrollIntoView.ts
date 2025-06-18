import { useEffect } from 'react';
import type { MutableRefObject } from 'react';

export function useScrollIntoView(
  scrollCondition: boolean,
  ref: MutableRefObject<HTMLDivElement>,
): void {
  useEffect(() => {
    if (scrollCondition && ref.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'start',
      });
    }
  }, [scrollCondition, ref]);
}
