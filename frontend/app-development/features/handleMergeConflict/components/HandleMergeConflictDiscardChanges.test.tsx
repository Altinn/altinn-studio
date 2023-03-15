import React from 'react';
import * as networking from 'app-shared/utils/networking';
import { HandleMergeConflictDiscardChanges } from './HandleMergeConflictDiscardChanges';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../testing/mocks/i18nMock';
import i18next from 'i18next';

const renderHandleMergeConflictDiscardChanges = () => {
  const user = userEvent.setup();
  render(<HandleMergeConflictDiscardChanges t={textMock as typeof i18next.t} />);
  return { user };
};
afterEach(() => jest.restoreAllMocks());
jest.mock('app-shared/utils/networking', () => ({
  __esModule: true,
  ...jest.requireActual('app-shared/utils/networking'),
}));

describe('HandleMergeConflictDiscardChanges', () => {
  test('should handle successfully returned data from API', async () => {
    const { user } = renderHandleMergeConflictDiscardChanges();

    const mockGet = jest.spyOn(networking, 'get').mockImplementationOnce(() => Promise.resolve());
    const discardMergeChangesBtn = screen.getByRole('button', {
      name: textMock('handle_merge_conflict.discard_changes_button'),
    });

    // Expect discard button to exist
    expect(discardMergeChangesBtn).toBeDefined();

    // Expect this button to open the popup
    expect(screen.queryAllByRole('presentation')).toHaveLength(0);
    await user.click(discardMergeChangesBtn);
    expect(screen.getByRole('presentation')).toBeDefined();

    const discardMergeChangesConfirmBtn = screen.getByRole('button', {
      name: textMock('handle_merge_conflict.discard_changes_button_confirm'),
    });
    expect(discardMergeChangesConfirmBtn).toBeDefined();
    await user.click(discardMergeChangesConfirmBtn);
    expect(mockGet).toHaveBeenCalled();
  });

  test('should handle unsuccessfully returned data from API', async () => {
    const { user } = renderHandleMergeConflictDiscardChanges();

    const mockGet = jest.spyOn(networking, 'get').mockImplementationOnce(() => Promise.reject());
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => 'error');
    const discardMergeChangesBtn = screen.getByRole('button', {
      name: textMock('handle_merge_conflict.discard_changes_button'),
    });

    await user.click(discardMergeChangesBtn);

    const discardMergeChangesConfirmBtn = screen.getByRole('button', {
      name: textMock('handle_merge_conflict.discard_changes_button_confirm'),
    });

    await user.click(discardMergeChangesConfirmBtn);
    expect(mockGet).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });
});
