import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { usePrevious } from './usePrevious';

const renderUsePrevious = <T>(initialProps: {
  state: T;
}): RenderHookResult<T | undefined, { state: T }> =>
  renderHook(({ state }) => usePrevious(state), { initialProps });

describe('usePrevious', () => {
  test('Returns undefined on initial render', () => {
    const { result } = renderUsePrevious({ state: 0 });
    expect(result.current).toBeUndefined();
  });

  test('Returns previous state after rerender', () => {
    const { result, rerender } = renderUsePrevious({ state: 0 });
    expect(result.current).toBeUndefined();
    rerender({ state: 1 });
    expect(result.current).toBe(0);
    rerender({ state: 2 });
    expect(result.current).toBe(1);
    rerender({ state: 4 });
    expect(result.current).toBe(2);
    rerender({ state: 8 });
    expect(result.current).toBe(4);
  });
});
