import { renderHook } from '@testing-library/react';
import { useRetainWhileLoading } from './useRetainWhileLoading';

describe('useRetainWhileLoading', () => {
  test('returns current value when not loading', () => {
    const { result, rerender } = renderHook(
      ({ loading, val }) => useRetainWhileLoading(loading, val),
      {
        initialProps: { loading: false, val: 10 },
      },
    );
    expect(result.current).toBe(10);
    rerender({ loading: false, val: 20 });
    expect(result.current).toBe(20);
  });

  test('returns previous value while loading', () => {
    const { result, rerender } = renderHook(
      ({ loading, val }) => useRetainWhileLoading(loading, val),
      {
        initialProps: { loading: false, val: 1 },
      },
    );
    rerender({ loading: false, val: 2 });
    expect(result.current).toBe(2);
    rerender({ loading: true, val: 3 });
    expect(result.current).toBe(2);
    rerender({ loading: true, val: 4 });
    expect(result.current).toBe(3);
    rerender({ loading: false, val: 5 });
    expect(result.current).toBe(5);
  });

  test('on first render while loading, falls back to current value', () => {
    const { result } = renderHook(({ loading, val }) => useRetainWhileLoading(loading, val), {
      initialProps: { loading: true, val: 'A' },
    });
    expect(result.current).toBe('A');
  });
});
