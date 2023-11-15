import React, { useEffect, useState } from 'react';

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { useWaitForState } from 'src/hooks/useWaitForState';

describe('useWaitForState', () => {
  it('should return a promise that resolves when the state is updated', async () => {
    const callback = jest.fn();
    render(<DummyComponent callback={callback} />);

    expect(callback).not.toHaveBeenCalled();
    expect(screen.getByTestId('current')).toHaveTextContent('initial');

    await userEvent.click(screen.getByRole('button', { name: 'Update' }));

    expect(callback).toHaveBeenCalledWith('state now set to updated, return value was "fooBar"');
    expect(screen.getByTestId('current')).toHaveTextContent('updated');
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

interface Props {
  callback: (explanation: string) => void;
}

function DummyComponent({ callback }: Props) {
  const [mySimpleState, setMySimpleState] = useState<string>('initial');
  const waitFor = useWaitForState<string, string>({
    cacheKey: 'mySimpleState',
    currentState: mySimpleState,
  });

  useEffect(() => {
    (async () => {
      const retVal = await waitFor((state, setReturnValue) => {
        if (state === 'updated') {
          setReturnValue('fooBar');
          return true;
        }
        return false;
      });
      callback(`state now set to updated, return value was ${JSON.stringify(retVal)}`);
    })();
    // eslint-disable-next-line testing-library/await-async-utils
  }, [callback, waitFor]);

  return (
    <>
      <div data-testid='current'>{mySimpleState}</div>
      <button onClick={() => setMySimpleState('updated')}>Update</button>
    </>
  );
}
