import React, { useRef, useState } from 'react';

import { jest } from '@jest/globals';
import { act, renderHook, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { useMemoDeepEqual, useStateDeepEqual } from 'src/hooks/useStateDeepEqual';
import { renderWithMinimalProviders } from 'src/test/renderWithProviders';

const initialState = { a: 1 };
const newState = { a: 2 };

describe('deep equality state functions', () => {
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
    it('should not return the updated value if it is equal to the previous value #1', () => {
      const { result } = renderHook(() => useStateDeepEqual(initialState));
      act(() => {
        result.current[1](initialState);
      });
      expect(result.current[0] === initialState).toBeTruthy();
    });
    it('should not return the updated value if it is equal to the previous value #2', () => {
      const { result } = renderHook(() => useStateDeepEqual(initialState));
      act(() => {
        result.current[1]((prev) => prev);
      });
      expect(result.current[0] === initialState).toBeTruthy();
    });
    it('should not return the updated value if it is equal to the previous value #3', () => {
      const { result } = renderHook(() => useStateDeepEqual(initialState));
      act(() => {
        result.current[1]((prev) => ({ ...prev }));
      });
      expect(result.current[0] === initialState).toBeTruthy();
    });

    function TestComponent() {
      const [state, setState] = useStateDeepEqual(initialState);
      const renderCount = useRef(0);
      renderCount.current += 1;

      return (
        <>
          <div data-testid='state'>{JSON.stringify(state)}</div>
          <div data-testid='render-count'>{renderCount.current}</div>
          <button onClick={() => setState({ a: 1 })}>Set initialState</button>
          <button onClick={() => setState({ a: 2 })}>Set newState</button>
        </>
      );
    }

    it('should only re-render if the state has changed', async () => {
      await renderWithMinimalProviders({
        renderer: () => <TestComponent />,
      });

      expect(screen.getByTestId('state')).toHaveTextContent(JSON.stringify(initialState));
      expect(screen.getByTestId('render-count')).toHaveTextContent('1');

      await userEvent.click(screen.getByText('Set initialState'));
      expect(screen.getByTestId('state')).toHaveTextContent(JSON.stringify(initialState));
      expect(screen.getByTestId('render-count')).toHaveTextContent('1');

      await userEvent.click(screen.getByText('Set newState'));
      expect(screen.getByTestId('state')).toHaveTextContent(JSON.stringify(newState));
      expect(screen.getByTestId('render-count')).toHaveTextContent('2');
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
});
