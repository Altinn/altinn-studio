import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useResetState } from './useResetState';

describe('useResetState', () => {
  it('returns the initial value on first render', () => {
    const { result } = renderHook(() => useResetState('initial state', 'key'));
    const [state] = result.current;
    expect(state).toBe('initial state');
  });

  it('updates state when changed with setState', () => {
    const { result } = renderHook(() => useResetState('initial state', 'key'));
    const [, setState] = result.current;

    act(() => setState('updated state'));

    const [state] = result.current;
    expect(state).toBe('updated state');
  });

  it('resets state to initialValue when resetKey changes', () => {
    let resetKey = 'initial key';
    const { result, rerender } = renderHook(() => useResetState('initial state', resetKey));
    const [, setState] = result.current;

    act(() => setState('updated state'));
    resetKey = 'updated key';
    rerender();

    const [state] = result.current;
    expect(state).toBe('initial state');
  });

  it('does not reset when initialValue changes after calling hook, when resetKey stays the same', () => {
    let initialValue = 'first value';
    const { result, rerender } = renderHook(() => useResetState(initialValue, 'key'));
    const [, setState] = result.current;

    act(() => setState('edited'));
    initialValue = 'second value';
    rerender();

    const [state] = result.current;
    expect(state).toBe('edited');
  });

  it('resets to new initialValue when both initalValue and resetKey changes after first call', () => {
    let initialValue = 'first';
    let resetKey = 'key-1';
    const { result, rerender } = renderHook(() => useResetState(initialValue, resetKey));
    const [, setState] = result.current;

    act(() => setState('edited'));
    initialValue = 'second';
    resetKey = 'key-2';
    rerender();

    const [state] = result.current;
    expect(state).toBe('second');
  });
});
