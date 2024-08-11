import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { MergeConflictModal } from './MergeConflictModal';
import { renderWithProviders } from '@studio/testing/wrapper';

const repoName = 'ttd-resources';

describe('MergeConflictModal', () => {
  afterEach(jest.clearAllMocks);

  it('should reset changes when reset button is clicked', async () => {
    const user = userEvent.setup();
    renderMergeConflictModal();

    const resetChangesButton = await screen.findByRole('button', {
      name: textMock('merge_conflict.remove_my_changes'),
    });
    await user.click(resetChangesButton);

    const repoTextfield = await screen.findByLabelText(
      textMock('resourceadm.reset_repo_confirm_repo_name'),
    );
    await user.type(repoTextfield, repoName);

    const confirmResetButton = await screen.findByRole('button', {
      name: textMock('local_changes.modal_confirm_delete_button'),
    });
    await user.click(confirmResetButton);

    expect(queriesMock.resetRepoChanges).toHaveBeenCalled();
  });

  it('should not call reset changes when reset button is clicked if wrong repo name is entered', async () => {
    const user = userEvent.setup();
    renderMergeConflictModal();

    const resetChangesButton = await screen.findByRole('button', {
      name: textMock('merge_conflict.remove_my_changes'),
    });
    await user.click(resetChangesButton);

    const repoTextfield = await screen.findByLabelText(
      textMock('resourceadm.reset_repo_confirm_repo_name'),
    );
    await user.type(repoTextfield, 'not-correct-text');

    const confirmResetButton = await screen.findByRole('button', {
      name: textMock('local_changes.modal_confirm_delete_button'),
    });
    await user.click(confirmResetButton);

    expect(queriesMock.resetRepoChanges).not.toHaveBeenCalled();
  });

  it('should close reset changes modal when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderMergeConflictModal();

    const resetChangesButton = await screen.findByRole('button', {
      name: textMock('merge_conflict.remove_my_changes'),
    });
    await user.click(resetChangesButton);

    const cancelButton = await screen.findByRole('button', {
      name: textMock('general.cancel'),
    });
    await user.click(cancelButton);

    expect(
      screen.queryByText(textMock('local_changes.modal_delete_modal_title')),
    ).not.toBeInTheDocument();
  });
});

const renderMergeConflictModal = () => {
  return renderWithProviders(<MergeConflictModal isOpen={true} org='ttd' repo={repoName} />);
};
