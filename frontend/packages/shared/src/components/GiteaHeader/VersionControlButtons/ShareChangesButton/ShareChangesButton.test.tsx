import React from 'react';
import { act, render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import type { IShareChangesButtonProps } from './ShareChangesButton';
import { ShareChangesButton } from './ShareChangesButton';

const user = userEvent.setup();

describe('shareChanges', () => {
  it('should call mock function when changes in local repo on click button', async () => {
    const handleShareChanges = jest.fn();
    render({ shareChanges: handleShareChanges });

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    await act(() => user.click(shareButton));

    expect(handleShareChanges).toHaveBeenCalled();
  });
});

const render = (props: Partial<IShareChangesButtonProps> = {}) => {
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

  return rtlRender(<ShareChangesButton {...allProps} />);
};
