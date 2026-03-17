import { useLayoutEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';

type Options = {
  isTarget: boolean;
  sectionRef: MutableRefObject<HTMLDivElement | null>;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
};

export function useScrollAndFocusOnParamTarget({
  isTarget,
  sectionRef,
  searchParams,
  setSearchParams,
}: Options): void {
  useLayoutEffect(() => {
    if (!isTarget || !sectionRef.current) return;

    const section = sectionRef.current;

    const scrollAndFocus = () => {
      section.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const field = section.querySelector('textarea, input') as
        | HTMLTextAreaElement
        | HTMLInputElement
        | null;

      field?.focus({ preventScroll: true });
    };

    requestAnimationFrame(scrollAndFocus);

    const next = new URLSearchParams(searchParams);
    next.delete('focus');
    setSearchParams(next, { replace: true });
  }, [isTarget, sectionRef, searchParams, setSearchParams]);
}
