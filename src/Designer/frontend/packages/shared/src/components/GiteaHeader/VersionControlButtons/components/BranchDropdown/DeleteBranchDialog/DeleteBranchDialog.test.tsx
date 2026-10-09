import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { DeleteBranchDialog } from './DeleteBranchDialog';
import type { DeleteBranchDialogProps } from './DeleteBranchDialog';
import { renderWithProviders } from '../../../../mocks/renderWithProviders';

const defaultProps: DeleteBranchDialogProps = {
  branchName: 'feature-branch',
  isOpen: true,
  onClose: vi.fn(),
  onDelete: vi.fn(),
};

describe('DeleteBranchDialog', () => {
  afterEach(vi.clearAllMocks);

  it('should disable confirm button when input does not match branch name', async () => {
    const user = userEvent.setup();
    renderDeleteBranchDialog();

    const confirmInput = getConfirmInput();
    await user.type(confirmInput, 'wrong-name');

    const confirmButton = getConfirmButton();
    expect(confirmButton).toBeDisabled();
  });

  it('should enable confirm button when input matches branch name exactly', async () => {
    const user = userEvent.setup();
    renderDeleteBranchDialog();

    const confirmInput = getConfirmInput();
    await user.type(confirmInput, 'feature-branch');

    const confirmButton = getConfirmButton();
    expect(confirmButton).not.toBeDisabled();
  });

  it('should call onDelete with branch name when confirmed', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderDeleteBranchDialog({ onDelete });

    const confirmInput = getConfirmInput();
    await user.type(confirmInput, 'feature-branch');

    const confirmButton = getConfirmButton();
    await user.click(confirmButton);

    expect(onDelete).toHaveBeenCalledWith('feature-branch');
  });

  it('should call onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDeleteBranchDialog({ onClose });

    const cancelButton = screen.getByRole('button', {
      name: textMock('general.cancel'),
    });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

const renderDeleteBranchDialog = (props: Partial<DeleteBranchDialogProps> = {}) => {
  return renderWithProviders()(<DeleteBranchDialog {...defaultProps} {...props} />);
};

const getConfirmInput = () => {
  return screen.getByLabelText(textMock('branching.delete_branch_dialog.textfield_label'));
};

const getConfirmButton = () => {
  return screen.getByRole('button', {
    name: textMock('general.delete'),
  });
};
