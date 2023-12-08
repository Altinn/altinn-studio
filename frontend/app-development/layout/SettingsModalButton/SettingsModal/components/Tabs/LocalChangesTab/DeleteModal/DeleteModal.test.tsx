import React, { useRef } from 'react';
import { render, screen, act } from '@testing-library/react';
import { DeleteModal, DeleteModalProps } from './DeleteModal';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const mockAppName: string = 'TestApp';
const mockButtonText: string = 'Mock Button';

const mockOnClose = jest.fn();
const mockOnDelete = jest.fn();

const defaultProps: DeleteModalProps = {
  onClose: mockOnClose,
  onDelete: mockOnDelete,
  appName: mockAppName,
};

describe('DeleteModal', () => {
  afterEach(jest.clearAllMocks);

  it('calls the onClose function when the Cancel button is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal();

    const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await act(() => user.click(cancelButton));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('updates the value of the text field when typing', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal();

    const textfield = screen.getByLabelText(
      textMock('settings_modal.local_changes_tab_delete_modal_textfield_label'),
    );
    expect(textfield).toHaveValue('');

    await act(() => user.type(textfield, 'a'));

    const textfieldAfter = screen.getByLabelText(
      textMock('settings_modal.local_changes_tab_delete_modal_textfield_label'),
    );
    expect(textfieldAfter).toHaveValue('a');
  });

  it('calls the onDelete function when the Delete button is clicked with a matching app name', async () => {
    const user = userEvent.setup();
    await renderAndOpenModal();

    const deleteButton = screen.getByRole('button', {
      name: textMock('settings_modal.local_changes_tab_delete_modal_delete_button'),
    });
    expect(deleteButton).toBeDisabled();

    const textfield = screen.getByLabelText(
      textMock('settings_modal.local_changes_tab_delete_modal_textfield_label'),
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

const renderAndOpenModal = async (props: Partial<DeleteModalProps> = {}) => {
  const user = userEvent.setup();
  render(<TestComponentWithButton {...props} />);

  const openModalButton = screen.getByRole('button', { name: mockButtonText });
  await act(() => user.click(openModalButton));
};

const TestComponentWithButton = (props: Partial<DeleteModalProps> = {}) => {
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button onClick={() => modalRef.current?.showModal()}>{mockButtonText}</button>
      <DeleteModal ref={modalRef} {...defaultProps} {...props} />
    </>
  );
};
