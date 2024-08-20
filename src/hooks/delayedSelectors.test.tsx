import React, { useRef, useState } from 'react';

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createStore } from 'zustand';

import { createZustandContext } from 'src/core/contexts/zustandContext';

interface State {
  state: number;
  increment: () => void;
  decrement: () => void;
}

function initialCreateStore() {
  return createStore<State>((set) => ({
    state: 0,
    increment: () => set((state) => ({ state: state.state + 1 })),
    decrement: () => set((state) => ({ state: state.state - 1 })),
  }));
}

const { Provider, useDelayedSelector, useSelector } = createZustandContext({
  name: 'Test',
  required: true,
  initialCreateStore,
});

const useSelectorWithStringCache = () =>
  useDelayedSelector({
    mode: 'simple',
    selector: (cacheKey: string) => (state) =>
      `cacheKey = ${cacheKey}, state = ${state.state}, random number = ${Math.random()}`,
  });

const useSelectorWithFunctionCache = () =>
  useDelayedSelector({
    mode: 'innerSelector',
    makeArgs: (state) => [state],
  });

function TestComponent() {
  return (
    <Provider>
      <TestStringCache />
      <TestFunctionCache />
      <IncrementButton />
    </Provider>
  );
}

function TestStringCache() {
  // Creating the selector at this level makes sure we re-use the same cache for all components
  const selectValue = useSelectorWithStringCache();

  return (
    <>
      <SelectValueWithStringCacheKey
        id={'test1-1'}
        cacheKey={'test1'}
        selectValue={selectValue}
      />
      <SelectValueWithStringCacheKey
        id={'test1-2'}
        cacheKey={'test1'}
        selectValue={selectValue}
      />
      <SelectValueWithStringCacheKey
        id={'test2'}
        cacheKey={'test2'}
        selectValue={selectValue}
      />
    </>
  );
}

interface SelectValueProps {
  cacheKey: string;
  id: string;
  selectValue: ReturnType<typeof useSelectorWithStringCache>;
}

function SelectValueWithStringCacheKey({ cacheKey, id, selectValue }: SelectValueProps) {
  const [, setState] = useState(0);
  const renderCount = useRef(0);
  renderCount.current += 1;

  const value = selectValue(cacheKey);
  return (
    <>
      <div data-testid={id}>
        {value}, render = {renderCount.current}
      </div>
      <button
        data-testid={`${id}-re-render`}
        onClick={() => setState((was) => was + 1)}
      >
        Force re-render
      </button>
    </>
  );
}

function TestFunctionCache() {
  const selectValue = useSelectorWithFunctionCache();

  return (
    <>
      <SelectValueWithFunctionCache
        id={'test3-1'}
        selectValue={selectValue}
      />
      <SelectValueWithFunctionCache
        id={'test3-2'}
        selectValue={selectValue}
      />
    </>
  );
}

function SelectValueWithFunctionCache({
  id,
  selectValue,
}: {
  id: string;
  selectValue: ReturnType<typeof useSelectorWithFunctionCache>;
}) {
  const [, setState] = useState(0);
  const renderCount = useRef(0);
  renderCount.current += 1;

  const value = selectValue((state) => `Counter = ${state.state}, random = ${Math.random()}`, []);
  return (
    <>
      <div data-testid={id}>
        {value}, render = {renderCount.current}
      </div>
      <button
        data-testid={`${id}-re-render`}
        onClick={() => setState((was) => was + 1)}
      >
        Force re-render
      </button>
    </>
  );
}

function IncrementButton() {
  const increment = useSelector((state) => state.increment);
  return (
    <button
      data-testid={'increment'}
      onClick={increment}
    >
      Increment
    </button>
  );
}

let expectedState = 0;
function stringResult(cacheKey: string, renderCount = 1, previous?: string) {
  if (previous) {
    return previous.replace(/render = \d+/, `render = ${renderCount}`);
  }

  return new RegExp(
    `cacheKey = ${cacheKey}, state = ${expectedState}, random number = \\d+\\.\\d+, render = ${renderCount}`,
  );
}

function functionResult(renderCount = 1, previous?: string) {
  if (previous) {
    return previous.replace(/render = \d+/, `render = ${renderCount}`);
  }

  return new RegExp(`Counter = ${expectedState}, random = \\d+\\.\\d+, render = ${renderCount}`);
}

describe('useDelayedSelector', () => {
  it('should cache according to cache key', async () => {
    render(<TestComponent />);

    expect(screen.getByTestId('test1-1').textContent).toMatch(stringResult('test1'));
    let firstStringValue = screen.getByTestId('test1-1').textContent!;

    // This would re-use the cache from the first one, so the call number should be the same
    expect(screen.getByTestId('test1-2')).toHaveTextContent(firstStringValue);

    expect(screen.getByTestId('test2').textContent).toMatch(stringResult('test2'));

    // The other cache key would have a different value, because the random number would be generated differently
    const secondValue = screen.getByTestId('test2').textContent;
    expect(secondValue).not.toBe(firstStringValue);

    // The function-based cache should also work
    expect(screen.getByTestId('test3-1').textContent).toMatch(functionResult());
    let firstFunctionValue = screen.getByTestId('test3-1').textContent!;

    // This would re-use the cache from the first one, so the call number should be the same
    expect(screen.getByTestId('test3-2')).toHaveTextContent(firstFunctionValue);

    // Force test1-2 and test3-2 to re-render. The selected state has not changed, so the cache should be re-used.
    await userEvent.click(screen.getByTestId('test1-2-re-render'));
    await userEvent.click(screen.getByTestId('test3-2-re-render'));

    expect(screen.getByTestId('test1-2').textContent).toBe(stringResult('test1', 2, firstStringValue));
    expect(screen.getByTestId('test3-2').textContent).toBe(functionResult(2, firstFunctionValue));

    // However, if we increment the state, everything will re-render. test1-2 and test3-2 have re-rendered
    // from the previous step, so they have rendered 3 times, but everything else should have rendered twice.
    await userEvent.click(screen.getByTestId('increment'));
    expectedState += 1;

    expect(screen.getByTestId('test1-1').textContent).toMatch(stringResult('test1', 2));
    firstStringValue = screen.getByTestId('test1-1').textContent!;

    expect(screen.getByTestId('test1-2').textContent).toMatch(stringResult('test1', 3, firstStringValue));
    expect(screen.getByTestId('test2').textContent).toMatch(stringResult('test2', 2));

    expect(screen.getByTestId('test3-1').textContent).toMatch(functionResult(2));
    firstFunctionValue = screen.getByTestId('test3-1').textContent!;

    expect(screen.getByTestId('test3-2').textContent).toMatch(functionResult(3, firstFunctionValue));
  });
});
