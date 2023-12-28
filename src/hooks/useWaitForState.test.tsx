import React, { useEffect, useState } from 'react';

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
        buttonClickSets={() => 'updated'}
      />,
    );

    expect(callback).not.toHaveBeenCalled();
    expect(screen.getByTestId('current')).toHaveTextContent('initial');

    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('updated'));

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('state now set to updated, return value was "fooBar"');
  });

  it('should return immediately if the state is already the one we wait for', async () => {
    const callback = jest.fn();
    render(
      <TesterComponent
        callback={callback}
        initialState='updated'
        targetState='updated'
        buttonClickSets={() => 'updated'}
      />,
    );

    await waitFor(() => expect(callback).toHaveBeenCalledTimes(1));
    expect(callback).toHaveBeenCalledWith('state now set to updated, return value was "fooBar"');
  });
});

interface Props {
  callback: (explanation: string) => void;
  initialState: string;
  targetState: string;
  buttonClickSets: () => string;
}

function TesterComponent({ callback, initialState, targetState, buttonClickSets }: Props) {
  const [mySimpleState, setMySimpleState] = useState<string>(initialState);
  const waitFor = useWaitForState<'fooBar', string>(mySimpleState);

  useEffect(() => {
    (async () => {
      const retVal = await waitFor((state, setReturnValue) => {
        if (state === targetState) {
          setReturnValue('fooBar');
          return true;
        }
        return false;
      });
      callback(`state now set to updated, return value was ${JSON.stringify(retVal)}`);
    })();
    // eslint-disable-next-line testing-library/await-async-utils
  }, [callback, targetState, waitFor]);

  return (
    <>
      <div data-testid='current'>{mySimpleState}</div>
      <button onClick={() => setMySimpleState(buttonClickSets())}>Update</button>
    </>
  );
}
