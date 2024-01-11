import React, { useEffect, useRef, useState } from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { useWaitForState } from 'src/hooks/useWaitForState';

describe('useWaitForState', () => {
  it('should return a promise that resolves when the state is updated', async () => {
    const callback = jest.fn();
    render(
      <TesterComponent
        callback={callback}
        initialState='initial'
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
    render(
      <TesterComponent
        callback={callback}
        initialState='initial'
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
    render(
      <TesterComponent
        callback={callback}
        initialState='updated'
        targetState='updated'
        buttonClickSets='updated'
      />,
    );

    await waitFor(() => expect(callback).toHaveBeenCalledTimes(1));
    expect(callback).toHaveBeenCalledWith('state now set to updated, return value was "fooBar"', 1);
  });

  it('should wait for the state even if we wait right after setting it', async () => {
    const callback = jest.fn();
    render(
      <TesterComponent
        callback={callback}
        initialState='initial'
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
});

interface Props {
  callback: (explanation: string, renderCount: number) => void;
  initialState: string;
  targetState: string;
  buttonClickSets: string;
  waitImmediatelyAndSet?: string;
}

function TesterComponent({ callback, initialState, targetState, buttonClickSets, waitImmediatelyAndSet }: Props) {
  const [mySimpleState, setMySimpleState] = useState<string>(initialState);
  const waitFor = useWaitForState<'fooBar', string>(mySimpleState);
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
    // eslint-disable-next-line testing-library/await-async-utils
  }, [callback, targetState, waitFor]);

  return (
    <>
      <div data-testid='current'>{mySimpleState}</div>
      <div data-testid='renderCount'>{renderCount.current}</div>
      <button
        onClick={async () => {
          setMySimpleState(buttonClickSets);
          if (waitImmediatelyAndSet) {
            await waitFor((state) => state === buttonClickSets);
            setMySimpleState(waitImmediatelyAndSet);
          }
        }}
      >
        Update
      </button>
    </>
  );
}
