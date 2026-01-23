import React, { useCallback, useEffect, useRef } from 'react';

import { jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createStore, useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { useWaitForState } from 'src/hooks/useWaitForState';

function createStringStore(initialValue: string) {
  return createStore<string>()(() => initialValue);
}

describe('useWaitForState', () => {
  it('should return a promise that resolves when the state is updated', async () => {
    const callback = jest.fn();
    const store = createStringStore('initial');
    render(
      <TesterComponent
        callback={callback}
        store={store}
        targetState='updated'
        buttonClickSets='updated'
      />,
    );

    expect(callback).not.toHaveBeenCalled();
    expect(screen.getByTestId('current')).toHaveTextContent('initial');

    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('updated'));

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('state now set to updated, return value was "fooBar"', 2);
  });

  it('should already have rendered the new value in the component when the promise resolves', async () => {
    const callback = jest.fn();
    const store = createStringStore('initial');
    render(
      <TesterComponent
        callback={callback}
        store={store}
        targetState='updated'
        buttonClickSets='updated'
      />,
    );

    expect(callback).not.toHaveBeenCalled();
    expect(screen.getByTestId('current')).toHaveTextContent('initial');

    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() => expect(callback).toHaveBeenCalledTimes(1));

    expect(screen.getByTestId('current')).toHaveTextContent('updated');
    expect(screen.getByTestId('renderCount')).toHaveTextContent('2');
    expect(callback).toHaveBeenCalledWith('state now set to updated, return value was "fooBar"', 2);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should return immediately if the state is already the one we wait for', async () => {
    const callback = jest.fn();
    const store = createStringStore('updated');
    render(
      <TesterComponent
        callback={callback}
        store={store}
        targetState='updated'
        buttonClickSets='updated'
      />,
    );

    await waitFor(() => expect(callback).toHaveBeenCalledTimes(1));
    expect(callback).toHaveBeenCalledWith('state now set to updated, return value was "fooBar"', 1);
  });

  it('should wait for the state even if we wait right after setting it', async () => {
    const callback = jest.fn();
    const store = createStringStore('initial');
    render(
      <TesterComponent
        callback={callback}
        store={store}
        targetState='updated'
        buttonClickSets='updated'
        waitImmediatelyAndSet='waited'
      />,
    );

    expect(callback).not.toHaveBeenCalled();
    expect(screen.getByTestId('current')).toHaveTextContent('initial');

    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('waited'));

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('state now set to updated, return value was "fooBar"', 2);

    // Render count is higher than 2, because the component renders once more when we set the state to 'waited'
    expect(screen.getByTestId('renderCount')).toHaveTextContent('3');
  });

  it('should only render child once, even if state changes multiple times', async () => {
    const callback = jest.fn();
    const store = createStringStore('initial');
    render(
      <TesterComponent
        callback={callback}
        store={store}
        targetState='updated'
        buttonClickSets='updated'
        otherButtonClickSets='other'
      />,
    );

    expect(callback).not.toHaveBeenCalled();
    expect(screen.getByTestId('current')).toHaveTextContent('initial');
    expect(screen.getByTestId('renderCount')).toHaveTextContent('1');
    expect(screen.getByTestId('childRenderCount')).toHaveTextContent('1');

    await userEvent.click(screen.getByRole('button', { name: 'Other' }));
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('other'));

    expect(screen.getByTestId('renderCount')).toHaveTextContent('2');
    expect(screen.getByTestId('childRenderCount')).toHaveTextContent('1');

    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('updated'));

    expect(screen.getByTestId('renderCount')).toHaveTextContent('3');
    expect(screen.getByTestId('childRenderCount')).toHaveTextContent('1');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('state now set to updated, return value was "fooBar"', 3);

    // Render count is higher than 2, because the component renders once more when we set the state to 'waited'
    expect(screen.getByTestId('childRenderCount')).toHaveTextContent('1');
  });

  it('should resolve promise even after component unmounts', async () => {
    const callback = jest.fn();
    const unmounted = jest.fn();
    const store = createStringStore('initial');
    const { unmount } = render(
      <TesterComponent
        callback={callback}
        store={store}
        targetState='updated'
        onUnmount={unmounted}
      />,
    );

    expect(screen.getByTestId('current')).toHaveTextContent('initial');
    expect(callback).not.toHaveBeenCalled();

    // Unmount the component before the state is updated
    unmount();
    await waitFor(() => expect(unmounted).toHaveBeenCalledTimes(1));

    render(
      <SetterComponent
        store={store}
        setToValue='updated'
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Set to updated' }));

    // The callback should still be called even though the component unmounted
    await waitFor(() => expect(callback).toHaveBeenCalledTimes(1));
    expect(callback).toHaveBeenCalledWith('state now set to updated, return value was "fooBar"', 1);
  });
});

interface Props {
  callback: (explanation: string, renderCount: number) => void;
  store: StoreApi<string>;
  targetState: string;
  buttonClickSets?: string;
  otherButtonClickSets?: string;
  waitImmediatelyAndSet?: string;
  onUnmount?: () => void;
}

function TesterComponent({
  callback,
  store,
  targetState,
  buttonClickSets,
  otherButtonClickSets,
  waitImmediatelyAndSet,
  onUnmount,
}: Props) {
  const waitFor = useWaitForState<'fooBar', string>(store);
  const mySimpleState = useStore(store);
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    (async () => {
      const retVal = await waitFor((state, setReturnValue) => {
        if (state === targetState) {
          setReturnValue('fooBar');
          return true;
        }
        return false;
      });
      callback(`state now set to ${targetState}, return value was ${JSON.stringify(retVal)}`, renderCount.current);
    })();
  }, [callback, targetState, waitFor]);

  useEffect(() => onUnmount ?? (() => {}), [onUnmount]);

  const waitUntilTargetState = useCallback(
    async () => await waitFor((state) => state === targetState),
    [targetState, waitFor],
  );

  return (
    <>
      <div data-testid='current'>{mySimpleState}</div>
      <div data-testid='renderCount'>{renderCount.current}</div>
      {buttonClickSets && (
        <button
          onClick={async () => {
            store.setState(buttonClickSets);
            if (waitImmediatelyAndSet) {
              await waitFor((state) => state === buttonClickSets);
              store.setState(waitImmediatelyAndSet);
            }
          }}
        >
          Update
        </button>
      )}
      {otherButtonClickSets && (
        <button
          onClick={async () => {
            store.setState(otherButtonClickSets);
          }}
        >
          Other
        </button>
      )}
      <ChildComponent wait={waitUntilTargetState} />
    </>
  );
}

function ChildComponentInner(_props: { wait: () => Promise<string> }) {
  const renderCount = useRef(0);
  renderCount.current++;

  return <div data-testid='childRenderCount'>{renderCount.current}</div>;
}

const ChildComponent = React.memo(ChildComponentInner);

function SetterComponent({ store, setToValue }: { store: StoreApi<string>; setToValue: string }) {
  const setStore = useCallback(() => store.setState(setToValue), [store, setToValue]);
  return <button onClick={setStore}>Set to {setToValue}</button>;
}
