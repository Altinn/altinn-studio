import { useState } from 'react';

import { act, renderHook } from '@testing-library/react';

import { useMemoDeepEqual, useStateDeepEqual } from 'src/hooks/useStateDeepEqual';

const initialState = { a: 1 };
const newState = { a: 2 };

describe('useStateDeepEqual', () => {
  it('should return the initial value', () => {
    const { result } = renderHook(() => useStateDeepEqual(initialState));
    expect(result.current[0] === initialState).toBeTruthy();
  });
  it('should return the updated value', () => {
    const { result } = renderHook(() => useStateDeepEqual(initialState));
    act(() => {
      result.current[1](newState);
    });
    expect(result.current[0] === newState).toBeTruthy();
    expect(result.current[0] === initialState).toBeFalsy();
  });
  it('should not return the updated value if it is equal to the previous value', () => {
    const { result } = renderHook(() => useStateDeepEqual(initialState));
    act(() => {
      result.current[1](initialState);
    });
    expect(result.current[0] === initialState).toBeTruthy();
  });
});

describe('useMemoDeepEqual', () => {
  it('should return the initial value', () => {
    const { result } = renderHook(() => useMemoDeepEqual(() => initialState, []));
    expect(result.current === initialState).toBeTruthy();
  });
  it('should return the updated value', () => {
    const { result } = renderHook(() => {
      const [depState, setDepState] = useState('foo');
      const memoResult = useMemoDeepEqual(() => {
        if (depState === 'baz') {
          return newState;
        }
        if (depState === 'bar') {
          return { a: 1 }; // Not the same object as initialState, but deepEqual
        }
        return initialState;
      }, [depState]);
      return { setDepState, memoResult };
    });
    act(() => {
      result.current.setDepState('bar');
    });
    expect(result.current.memoResult === initialState).toBeTruthy();
    act(() => {
      result.current.setDepState('baz');
    });
    expect(result.current.memoResult === newState).toBeTruthy();
  });
  it('memo function should only be called when dependencies change', () => {
    const memoFn = jest.fn(() => initialState);
    const { result } = renderHook(() => {
      const [depState, setDepState] = useState('foo');
      useMemoDeepEqual(memoFn, [depState]);
      return { setDepState };
    });
    expect(memoFn).toHaveBeenCalledTimes(1);
    act(() => {
      result.current.setDepState('bar');
    });
    expect(memoFn).toHaveBeenCalledTimes(2);
    act(() => {
      result.current.setDepState('bar');
    });
    expect(memoFn).toHaveBeenCalledTimes(2);
  });
});
