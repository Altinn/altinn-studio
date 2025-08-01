import { renderHook } from '@testing-library/react';
import { usePrevious } from './usePrevious';

describe('usePrevious', () => {
  it('Returns undefined on initial render', () => {
    const { result } = renderHook(() => usePrevious(0));
    expect(result.current).toBeUndefined();
  });

  it('Returns previous state after rerender', () => {
    let state = 0;
    const { result, rerender } = renderHook(() => usePrevious(state));

    expect(result.current).toBeUndefined();

    state = 1;
    rerender();
    expect(result.current).toBe(0);

    state = 2;
    rerender();
    expect(result.current).toBe(1);

    state = 3;
    rerender();
    expect(result.current).toBe(2);

    state = 4;
    rerender();
    expect(result.current).toBe(3);
  });
});
