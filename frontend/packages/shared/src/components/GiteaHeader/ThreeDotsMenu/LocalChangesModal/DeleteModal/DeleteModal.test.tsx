import React from 'react';
import { screen } from '@testing-library/react';
import type { DeleteModalProps } from './DeleteModal';
import { DeleteModal } from './DeleteModal';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { renderWithProviders } from '@studio/testing/wrapper';

const mockApp: string = 'TestApp';
const mockOrg: string = 'TestOrg';

const mockOnClose = jest.fn();

const defaultProps: DeleteModalProps = {
  isOpen: true,
  onClose: mockOnClose,
  app: mockApp,
  org: mockOrg,
};

describe('DeleteModal', () => {
  afterEach(jest.clearAllMocks);

  it('calls the onClose function when the Cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderDeleteModal();

    const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await user.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('updates the value of the text field when typing', async () => {
    const user = userEvent.setup();
    renderDeleteModal();

    const textfield = screen.getByLabelText(
      textMock('local_changes.modal_delete_modal_textfield_label'),
    );
    expect(textfield).toHaveValue('');

    await user.type(textfield, 'a');

    const textfieldAfter = screen.getByLabelText(
      textMock('local_changes.modal_delete_modal_textfield_label'),
    );
    expect(textfieldAfter).toHaveValue('a');
  });

  it('calls the handleDelete function when the Delete button is clicked with a matching app name', async () => {
    const user = userEvent.setup();

    const mockDelete = jest.fn().mockImplementation(() => Promise.resolve());

    renderDeleteModal({ resetRepoChanges: mockDelete });

    const deleteButton = screen.getByRole('button', {
      name: textMock('local_changes.modal_confirm_delete_button'),
    });
    expect(deleteButton).toBeDisabled();

    const textfield = screen.getByLabelText(
      textMock('local_changes.modal_delete_modal_textfield_label'),
    );
    await user.type(textfield, mockApp);
    expect(deleteButton).not.toBeDisabled();

    expect(mockDelete).toHaveBeenCalledTimes(0);
    await user.click(deleteButton);
    expect(mockDelete).toHaveBeenCalledTimes(1);

    const toastSuccessText = await screen.findByText(
      textMock('local_changes.modal_deleted_success'),
    );
    expect(toastSuccessText).toBeInTheDocument();
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not call the onClose function when the Delete button is clicked and an error is received', async () => {
    const user = userEvent.setup();

    const mockDelete = jest.fn().mockImplementation(() => Promise.reject());

    renderDeleteModal({ resetRepoChanges: mockDelete });

    const deleteButton = screen.getByRole('button', {
      name: textMock('local_changes.modal_confirm_delete_button'),
    });
    expect(deleteButton).toBeDisabled();

    const textfield = screen.getByLabelText(
      textMock('local_changes.modal_delete_modal_textfield_label'),
    );
    await user.type(textfield, mockApp);
    expect(deleteButton).not.toBeDisabled();

    expect(mockDelete).toHaveBeenCalledTimes(0);
    await user.click(deleteButton);

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(0);
  });
});

const renderDeleteModal = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  return renderWithProviders(<DeleteModal {...defaultProps} />, { queries, queryClient });
};
