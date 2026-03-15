import { useLayoutEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';

type Options = {
  isTarget: boolean;
  sectionRef: MutableRefObject<HTMLDivElement | null>;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  getFocusElement?: (section: HTMLDivElement) => HTMLElement | null;
  onFocused?: () => void;
  clearFocusParam?: boolean;
};

export function useScrollAndFocusOnParamTarget({
  isTarget,
  sectionRef,
  searchParams,
  setSearchParams,
  getFocusElement,
  onFocused,
  clearFocusParam = true,
}: Options): void {
  useLayoutEffect(() => {
    if (!isTarget || !sectionRef.current) return;

    const section = sectionRef.current;

    const scrollAndFocus = () => {
      section.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const target =
        getFocusElement?.(section) ??
        (section.querySelector('textarea, input') as HTMLTextAreaElement | HTMLInputElement | null);
      if (target) {
        target.focus({ preventScroll: true });
        onFocused?.();
      }
    };

    requestAnimationFrame(scrollAndFocus);

    if (clearFocusParam) {
      const next = new URLSearchParams(searchParams);
      next.delete('focus');
      setSearchParams(next, { replace: true });
    }
  }, [
    isTarget,
    sectionRef,
    searchParams,
    setSearchParams,
    getFocusElement,
    onFocused,
    clearFocusParam,
  ]);
}
