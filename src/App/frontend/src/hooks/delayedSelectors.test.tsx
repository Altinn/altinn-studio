import React, { useRef, useState } from 'react';

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createStore } from 'zustand';

import { createZustandContext } from 'src/core/contexts/zustandContext';

interface State {
  state: number;
  someString: string;
  increment: () => void;
  decrement: () => void;
  setString: (someString: string) => void;
}

function initialCreateStore() {
  return createStore<State>((set) => ({
    state: 0,
    someString: 'test',
    increment: () => set((state) => ({ state: state.state + 1 })),
    decrement: () => set((state) => ({ state: state.state - 1 })),
    setString: (someString: string) => set({ someString }),
  }));
}

const Ctx = createZustandContext({
  name: 'Ctx',
  required: true,
  initialCreateStore,
});

const useSelectorWithStringCache = () =>
  Ctx.useDelayedSelector({
    mode: 'simple',
    selector: (cacheKey: string) => (state) =>
      `cacheKey = ${cacheKey}, state = ${state.state}, random number = ${Math.random()}`,
  });

const useSelectorWithFunctionCache = () =>
  Ctx.useDelayedSelector({
    mode: 'innerSelector',
    makeArgs: (state) => [state],
  });

interface Props {
  onGetValue: (value: unknown) => void;
}

function TestComponent({ onGetValue }: Props) {
  return (
    <Ctx.Provider>
      <TestStringCache />
      <TestFunctionCache />
      <TestSingleDelayedSelector onGetValue={onGetValue} />
      <IncrementButton />
    </Ctx.Provider>
  );
}

function TestStringCache() {
  // Creating the selector at this level makes sure we re-use the same cache for all components
  const selectValue = useSelectorWithStringCache();

  return (
    <>
      <SelectValueWithStringCacheKey
        id='test1-1'
        cacheKey='test1'
        selectValue={selectValue}
      />
      <SelectValueWithStringCacheKey
        id='test1-2'
        cacheKey='test1'
        selectValue={selectValue}
      />
      <SelectValueWithStringCacheKey
        id='test2'
        cacheKey='test2'
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
        id='test3-1'
        selectValue={selectValue}
      />
      <SelectValueWithFunctionCache
        id='test3-2'
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
  const increment = Ctx.useSelector((state) => state.increment);
  return (
    <button
      data-testid='increment'
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

function TestSingleDelayedSelector({ onGetValue }: Props) {
  const renderCount = useRef(0);
  renderCount.current += 1;

  const otherCount = useRef(0);
  const ds = Ctx.useDelayedSelector({
    mode: 'innerSelector',
    makeArgs: (state) => [state.state] as const,
  });

  const setString = Ctx.useStaticSelector((state) => state.setString);
  const increment = Ctx.useStaticSelector((state) => state.increment);

  return (
    <>
      <div data-testid='single-selector-render-count'>{renderCount.current}</div>

      {/* Setters */}
      <button onClick={increment}>Increment ctx1</button>
      <button
        onClick={() => {
          increment();
          increment();
        }}
      >
        Increment ctx1 twice
      </button>
      <button onClick={() => (otherCount.current += 1)}>Increment otherCount</button>
      <button onClick={() => setString('new string')}>Set fixed string in ctx1</button>

      {/* Getters */}
      <button
        onClick={() =>
          onGetValue(
            ds((state) => [state, otherCount.current], []), // Intentionally not putting otherCount in deps
          )
        }
      >
        Get ds without otherCount in deps
      </button>
      <button onClick={() => onGetValue(ds((state) => [state, otherCount.current], [otherCount.current]))}>
        Get ds with otherCount in deps
      </button>
      <button onClick={() => onGetValue(ds((state) => state, []))}>Get ds state</button>
    </>
  );
}

describe('useDelayedSelector', () => {
  it('should cache according to cache key', async () => {
    const fn = jest.fn();
    render(<TestComponent onGetValue={fn} />);

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

  it('delayed selector behaves as expected', async () => {
    const fn = jest.fn();
    render(<TestComponent onGetValue={fn} />);

    expect(screen.getByTestId('single-selector-render-count').textContent).toBe('1');

    // Incrementing does not change the render count, as no state has been fetched yet
    await userEvent.click(screen.getByText('Increment ctx1'));
    expect(screen.getByTestId('single-selector-render-count').textContent).toBe('1');

    // Fetching ds will also not trigger a re-render, as this is the first time it's being fetched
    await userEvent.click(screen.getByText('Get ds without otherCount in deps'));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith([1, 0]);
    expect(screen.getByTestId('single-selector-render-count').textContent).toBe('1');
    fn.mockClear();

    // Incrementing now will immediately re-render, as ds has been fetched before
    await userEvent.click(screen.getByText('Increment ctx1'));
    expect(screen.getByTestId('single-selector-render-count').textContent).toBe('2');

    // Incrementing once again will not re-render, as ds hasn't been fetched yet after the last increment
    await userEvent.click(screen.getByText('Increment ctx1'));
    expect(screen.getByTestId('single-selector-render-count').textContent).toBe('2');

    // Re-fetching after the latest invalidation computes the latest value without triggering a re-render.
    await userEvent.click(screen.getByText('Get ds without otherCount in deps'));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith([3, 0]);
    expect(screen.getByTestId('single-selector-render-count').textContent).toBe('2');
    fn.mockClear();

    // If we increment otherCount now, it should not trigger a re-render, and getting ds again should return
    // the same value as before (even though otherCount has changed). This happens because otherCount is not in the
    // dependencies of the selector.
    await userEvent.click(screen.getByText('Increment otherCount'));
    await userEvent.click(screen.getByText('Get ds without otherCount in deps'));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith([3, 0]);
    fn.mockClear();

    // But if we get ds with otherCount in the deps, the count should be correct
    await userEvent.click(screen.getByText('Get ds with otherCount in deps'));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith([3, 1]);
    fn.mockClear();

    // Reset the selector cache, then make sure we can select a different value shape, but not the string field.
    await userEvent.click(screen.getByText('Increment ctx1'));
    expect(screen.getByTestId('single-selector-render-count').textContent).toBe('3');

    await userEvent.click(screen.getByText('Get ds state'));
    await userEvent.click(screen.getByText('Get ds with otherCount in deps'));
    expect(screen.getByTestId('single-selector-render-count').textContent).toBe('3');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 4);
    expect(fn).toHaveBeenNthCalledWith(2, [4, 1]);
    fn.mockClear();

    // Setting a fixed string in ctx1 should not trigger a re-render. This string does not affect the selected state.
    await userEvent.click(screen.getByText('Set fixed string in ctx1'));
    expect(screen.getByTestId('single-selector-render-count').textContent).toBe('3');
    await userEvent.click(screen.getByText('Get ds with otherCount in deps'));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith([4, 1]);
    fn.mockClear();

    // Getting from ctx1 to prepare for the next increment
    await userEvent.click(screen.getByText('Get ds state'));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith(4);
    fn.mockClear();

    // Incrementing twice now should only trigger one re-render.
    await userEvent.click(screen.getByText('Increment ctx1 twice'));
    expect(screen.getByTestId('single-selector-render-count').textContent).toBe('4');
  });
});
