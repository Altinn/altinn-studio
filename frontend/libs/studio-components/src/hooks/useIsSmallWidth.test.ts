import { act, renderHook } from '@testing-library/react';
import { useIsSmallWidth } from './useIsSmallWidth';

describe('useIsSmallWidth', () => {
  const originalInnerWidth = global.innerWidth;

  beforeEach(() => {
    global.innerWidth = originalInnerWidth;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return true if window width is less than specified width', () => {
    global.innerWidth = 500;

    const { result } = renderHook(() => useIsSmallWidth(800));

    expect(result.current).toBe(true);
  });

  it('should return false if window width is greater than specified width', () => {
    global.innerWidth = 1000;

    const { result } = renderHook(() => useIsSmallWidth(800));

    expect(result.current).toBe(false);
  });

  it('should update value when window is resized', () => {
    const { result } = renderHook(() => useIsSmallWidth(800));

    expect(result.current).toBe(global.innerWidth < 800);

    act(() => {
      global.innerWidth = 700;
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(true);

    act(() => {
      global.innerWidth = 900;
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(false);
  });

  it('should clean up event listener on unmount', () => {
    const { unmount } = renderHook(() => useIsSmallWidth(800));

    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
