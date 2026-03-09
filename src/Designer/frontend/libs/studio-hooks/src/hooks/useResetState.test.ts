import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { Dispatch, SetStateAction } from 'react';
import { act } from 'react';
import { useResetState } from './useResetState';

describe('useResetState', () => {
  it('returns the initial value on first render', () => {
    const { result } = renderUseResetState('hello', 'key-1');
    const [state] = result.current;
    expect(state).toBe('hello');
  });

  it('keeps the state when resetKey has not changed', () => {
    const { result } = renderUseResetState('hello', 'key-1');
    const [, setState] = result.current;
    act(() => setState('updated'));
    const [state] = result.current;
    expect(state).toBe('updated');
  });

  it('resets the state to initialValue when resetKey changes', () => {
    const { result, rerender } = renderUseResetState('hello', 'key-1');
    const [, setState] = result.current;
    act(() => setState('updated'));
    rerender({ initialValue: 'hello', resetKey: 'key-2' });
    const [state] = result.current;
    expect(state).toBe('hello');
  });

  it('uses the new initialValue when resetKey changes', () => {
    const { result, rerender } = renderUseResetState('first', 'key-1');
    rerender({ initialValue: 'second', resetKey: 'key-2' });
    const [state] = result.current;
    expect(state).toBe('second');
  });

  it('does not reset when resetKey is the same reference', () => {
    const { result, rerender } = renderUseResetState('hello', 'key-1');
    const [, setState] = result.current;
    act(() => setState('updated'));
    rerender({ initialValue: 'hello', resetKey: 'key-1' });
    const [state] = result.current;
    expect(state).toBe('updated');
  });

  it('handles NaN as resetKey using Object.is semantics', () => {
    const { result, rerender } = renderUseResetState('hello', NaN);
    const [, setState] = result.current;
    act(() => setState('updated'));
    rerender({ initialValue: 'hello', resetKey: NaN });
    const [state] = result.current;
    expect(state).toBe('updated');
  });
});

type UseResetStateProps = {
  initialValue: string;
  resetKey: unknown;
};

type UseResetStateResult = [string, Dispatch<SetStateAction<string>>];

function renderUseResetState(
  initialValue: string,
  resetKey: unknown,
): RenderHookResult<UseResetStateResult, UseResetStateProps> {
  return renderHook<UseResetStateResult, UseResetStateProps>(
    (props) => useResetState<string>(props.initialValue, props.resetKey),
    { initialProps: { initialValue, resetKey } },
  );
}
