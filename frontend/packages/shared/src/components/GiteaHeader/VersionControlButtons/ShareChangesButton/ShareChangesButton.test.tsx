import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { IShareChangesButtonProps } from './ShareChangesButton';
import { ShareChangesButton } from './ShareChangesButton';

const user = userEvent.setup();

describe('shareChanges', () => {
  it('should call mock function when changes in local repo on click button', async () => {
    const handleShareChanges = jest.fn();
    renderShareChangesButton({ shareChanges: handleShareChanges });

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    await user.click(shareButton);

    expect(handleShareChanges).toHaveBeenCalled();
  });

  it('should render number of changes when displayNotification is true and there are no merge conflicts', () => {
    renderShareChangesButton({ displayNotification: true });

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });

    expect(shareButton).toHaveTextContent(textMock('sync_header.changes_to_share') + 1);
  });

  it('should not render number of changes when displayNotification is true and there are merge conflicts', () => {
    renderShareChangesButton({ displayNotification: true, hasMergeConflict: true });

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.merge_conflict'),
    });

    expect(shareButton).not.toHaveTextContent(textMock('sync_header.merge_conflict') + 1);
  });

  it('should render merge conflict button as disabled when there are merge conflicts', () => {
    renderShareChangesButton({ displayNotification: true, hasMergeConflict: true });

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.merge_conflict'),
    });

    expect(shareButton).toHaveAttribute('disabled');
  });

  it('should render share changes button as disabled when hasPushRight is false', () => {
    renderShareChangesButton({ hasPushRight: false });

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });

    expect(shareButton).toHaveAttribute('disabled');
  });
});

const renderShareChangesButton = (props: Partial<IShareChangesButtonProps> = {}) => {
  const allProps = {
    classes: {},
    shareChanges: jest.fn(),
    changesInLocalRepo: true,
    hasPushRight: true,
    hasMergeConflict: false,
    language: {},
    displayNotification: false,
    ...props,
  };

  return render(<ShareChangesButton {...allProps} />);
};
