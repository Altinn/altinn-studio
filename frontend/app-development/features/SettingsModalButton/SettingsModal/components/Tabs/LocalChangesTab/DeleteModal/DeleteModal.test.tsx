import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { DeleteModal, DeleteModalProps } from './DeleteModal';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const mockAppName: string = 'TestApp';

describe('DeleteModal', () => {
  const user = userEvent.setup();
  afterEach(jest.clearAllMocks);

  const mockOnClose = jest.fn();
  const mockOnDelete = jest.fn();

  const defaultProps: DeleteModalProps = {
    isOpen: true,
    onClose: mockOnClose,
    onDelete: mockOnDelete,
    appName: mockAppName,
  };

  it('calls the onClose function when the Cancel button is clicked', async () => {
    render(<DeleteModal {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await act(() => user.click(cancelButton));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('updates the value of the text field when typing', async () => {
    render(<DeleteModal {...defaultProps} />);

    const textfield = screen.getByLabelText(
      textMock('settings_modal.local_changes_tab_delete_modal_textfield_label')
    );
    expect(textfield).toHaveValue('');

    await act(() => user.type(textfield, 'a'));

    const textfieldAfter = screen.getByLabelText(
      textMock('settings_modal.local_changes_tab_delete_modal_textfield_label')
    );
    expect(textfieldAfter).toHaveValue('a');
  });

  it('calls the onDelete function when the Delete button is clicked with a matching app name', async () => {
    render(<DeleteModal {...defaultProps} />);

    const deleteButton = screen.getByRole('button', {
      name: textMock('settings_modal.local_changes_tab_delete_modal_delete_button'),
    });
    expect(deleteButton).toBeDisabled();

    const textfield = screen.getByLabelText(
      textMock('settings_modal.local_changes_tab_delete_modal_textfield_label')
    );
    await act(() => user.type(textfield, mockAppName));

    const deleteButtonAfterTypedInName = screen.getByRole('button', {
      name: textMock('settings_modal.local_changes_tab_delete_modal_delete_button'),
    });
    expect(deleteButtonAfterTypedInName).not.toBeDisabled();

    await act(() => user.click(deleteButton));
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });
});
