import React from 'react';
import { FetchChangesButton, IFetchChangesButtonProps } from './FetchChangesButton';
import { act, render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

describe('fetchChanges', () => {
  it('should call fetchChanges when clicking sync button', async () => {
    const handleFetchChanges = jest.fn();
    render({ fetchChanges: handleFetchChanges });
    const syncButton = screen.getByTestId('fetch-changes-button');
    await act(() => user.click(syncButton));
    expect(handleFetchChanges).toHaveBeenCalled();
  });
});

const render = (props: Partial<IFetchChangesButtonProps> = {}) => {
  const allProps = {
    changesInMaster: true,
    fetchChanges: jest.fn(),
    buttonText: 'pull',
    displayNotification: false,
    numChanges: 0,
    ...props,
  };
  return rtlRender(<FetchChangesButton {...allProps} />);
};
