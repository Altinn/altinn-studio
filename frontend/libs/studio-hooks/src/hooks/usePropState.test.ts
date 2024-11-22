import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { usePropState } from './usePropState';
import type { Dispatch, SetStateAction } from 'react';
import { act } from 'react';

describe('usePropState', () => {
  it('Returns the initial prop value when it is not changed', () => {
    const initialValue = 'test';
    const { result } = renderUsePropState(initialValue);
    const [state] = result.current;
    expect(state).toBe(initialValue);
  });

  it('Updates the state when the prop is changed', () => {
    const initialValue = 'test';
    const { result, rerender } = renderUsePropState(initialValue);
    const newValue = 'new value';
    rerender({ prop: newValue });
    const [state] = result.current;
    expect(state).toBe(newValue);
  });

  it('Updates the state when the set function is called', () => {
    const initialValue = 'test';
    const { result } = renderUsePropState(initialValue);
    const newValue = 'new value';
    const [, setState] = result.current;
    act(() => setState(newValue));
    const [state] = result.current;
    expect(state).toBe(newValue);
  });
});

type TestProp = string;

type UsePropStateProps = {
  prop: TestProp;
};

type UsePropStateResult = [TestProp, Dispatch<SetStateAction<TestProp>>];

function renderUsePropState(
  initialValue: TestProp,
): RenderHookResult<UsePropStateResult, UsePropStateProps> {
  return renderHook<UsePropStateResult, UsePropStateProps>(
    ({ prop }) => usePropState<TestProp>(prop),
    { initialProps: { prop: initialValue } },
  );
}
