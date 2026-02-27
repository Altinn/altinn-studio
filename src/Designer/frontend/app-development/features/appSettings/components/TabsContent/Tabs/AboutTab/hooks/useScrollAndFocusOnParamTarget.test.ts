import { renderHook } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import { useScrollAndFocusOnParamTarget } from './useScrollAndFocusOnParamTarget';

describe('useScrollAndFocusOnParamTarget', () => {
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  beforeEach(() => {
    jest
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback): number => {
        callback(0);
        return 0;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  });

  it('scrolls, focuses and clears focus param when target is true and ref is valid', () => {
    const scrollIntoView = jest.fn();
    const focus = jest.fn();
    const querySelector = jest.fn().mockReturnValue({ focus });
    const sectionRef = createSectionRef(scrollIntoView, querySelector);
    const searchParams = new URLSearchParams('focus=rightDescription-nb&other=value');
    const setSearchParams = jest.fn();
    renderUseScrollAndFocusOnParamTarget(true, sectionRef, searchParams, setSearchParams);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(querySelector).toHaveBeenCalledWith('textarea, input');
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(setSearchParams).toHaveBeenCalledTimes(1);
  });

  it('does not scroll or focus when target is false', () => {
    const scrollIntoView = jest.fn();
    const querySelector = jest.fn();
    const sectionRef = createSectionRef(scrollIntoView, querySelector);
    const searchParams = new URLSearchParams('focus=rightDescription-nb');
    const setSearchParams = jest.fn();
    renderUseScrollAndFocusOnParamTarget(false, sectionRef, searchParams, setSearchParams);
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(querySelector).not.toHaveBeenCalled();
    expect(setSearchParams).not.toHaveBeenCalled();
  });

  function createSectionRef(
    scrollIntoView: jest.Mock,
    querySelector: jest.Mock,
  ): MutableRefObject<HTMLDivElement | null> {
    return {
      current: { scrollIntoView, querySelector },
    } as unknown as MutableRefObject<HTMLDivElement | null>;
  }
});

function renderUseScrollAndFocusOnParamTarget(
  isTarget: boolean,
  sectionRef: MutableRefObject<HTMLDivElement | null>,
  searchParams: URLSearchParams,
  setSearchParams: (nextInit: URLSearchParams, navigateOpts?: { replace?: boolean }) => void,
) {
  return renderHook(() =>
    useScrollAndFocusOnParamTarget({
      isTarget,
      sectionRef,
      searchParams,
      setSearchParams,
    }),
  );
}
