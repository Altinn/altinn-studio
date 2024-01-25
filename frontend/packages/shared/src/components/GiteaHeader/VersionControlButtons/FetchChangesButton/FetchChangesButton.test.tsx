import React from 'react';
import type { IFetchChangesButtonProps } from './FetchChangesButton';
import { FetchChangesButton } from './FetchChangesButton';
import { act, render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';

const user = userEvent.setup();

describe('fetchChanges', () => {
  it('should call fetchChanges when clicking sync button', async () => {
    const handleFetchChanges = jest.fn();
    render({ fetchChanges: handleFetchChanges });
    const syncButton = screen.getByRole('button', { name: textMock('sync_header.fetch_changes') });
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
