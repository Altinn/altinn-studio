import React from 'react';
import type { IFetchChangesButtonProps } from './FetchChangesButton';
import { FetchChangesButton } from './FetchChangesButton';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';

const user = userEvent.setup();

describe('fetchChanges', () => {
  it('should call fetchChanges when clicking sync button', async () => {
    const handleFetchChanges = jest.fn();
    render({ fetchChanges: handleFetchChanges });
    const syncButton = screen.getByRole('button', { name: textMock('sync_header.fetch_changes') });
    await user.click(syncButton);
    expect(handleFetchChanges).toHaveBeenCalled();
  });

  it('should render number of changes when displayNotification is true and there are no merge conflicts', () => {
    const numberOfChanges = 123;
    render({ displayNotification: true, numChanges: numberOfChanges });

    const syncButton = screen.getByRole('button', {
      name: textMock('sync_header.fetch_changes'),
    });

    expect(syncButton).toHaveTextContent(textMock('sync_header.fetch_changes') + numberOfChanges);
  });

  it('should not render number of changes when displayNotification is true and there are merge conflicts', () => {
    const numberOfChanges = 123;
    render({ displayNotification: true, numChanges: numberOfChanges, hasMergeConflict: true });

    const syncButton = screen.getByRole('button', {
      name: textMock('sync_header.fetch_changes'),
    });

    expect(syncButton).not.toHaveTextContent(
      textMock('sync_header.fetch_changes') + numberOfChanges,
    );
  });

  it('should render fetch changes button as disabled when there are merge conflicts', () => {
    render({ hasMergeConflict: true });

    const syncButton = screen.getByRole('button', {
      name: textMock('sync_header.fetch_changes'),
    });

    expect(syncButton).toHaveAttribute('disabled');
  });
});

const render = (props: Partial<IFetchChangesButtonProps> = {}) => {
  const allProps = {
    changesInMaster: true,
    fetchChanges: jest.fn(),
    buttonText: 'pull',
    displayNotification: false,
    numChanges: 0,
    hasMergeConflict: false,
    ...props,
  };
  return rtlRender(<FetchChangesButton {...allProps} />);
};
