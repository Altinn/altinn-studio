import React from 'react';
import { CommitAndPushContent, type CommitAndPushContentProps } from './CommitAndPushContent';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { VersionControlButtonsContext } from '../../../context';
import { mockVersionControlButtonsContextValue } from '../../../test/mocks/versionControlContextMock';

const mockHandleClonsePopover = jest.fn();

const defaultProps: CommitAndPushContentProps = {
  handleClosePopover: mockHandleClonsePopover,
};

describe('CommitAndPushContent', () => {
  afterEach(jest.clearAllMocks);

  it('should render the component with all texts and textarea', () => {
    renderCommitAndPushContent();

    expect(screen.getByText(textMock('sync_header.describe_and_validate'))).toBeInTheDocument();
    expect(
      screen.getByText(textMock('sync_header.describe_and_validate_sub_message')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('sync_header.describe_and_validate_sub_sub_message')),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(textMock('sync_header.describe_changes_made')),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('sync_header.describe_and_validate_btnText') }),
    ).toBeInTheDocument();
  });

  it('should update commit message state when typing in the textarea', async () => {
    const user = userEvent.setup();
    renderCommitAndPushContent();

    const textarea = screen.getByLabelText(textMock('sync_header.describe_changes_made'));
    const commitMessage = 'This is a commit message';
    await user.type(textarea, commitMessage);

    expect(textarea).toHaveValue(commitMessage);
  });

  it('should call commitAndPushChanges with commit message and handleClosePopover when clicking the button', async () => {
    const user = userEvent.setup();
    renderCommitAndPushContent();

    const commitMessage = 'This is a commit message';
    const textarea = screen.getByLabelText(textMock('sync_header.describe_changes_made'));
    await user.type(textarea, commitMessage);

    const commitButton = screen.getByRole('button', {
      name: textMock('sync_header.describe_and_validate_btnText'),
    });
    await user.click(commitButton);

    expect(mockVersionControlButtonsContextValue.commitAndPushChanges).toHaveBeenCalledWith(
      commitMessage,
    );
    expect(mockHandleClonsePopover).toHaveBeenCalled();
  });
});

const renderCommitAndPushContent = () => {
  return render(
    <VersionControlButtonsContext.Provider value={mockVersionControlButtonsContextValue}>
      <CommitAndPushContent {...defaultProps} />
    </VersionControlButtonsContext.Provider>,
  );
};
