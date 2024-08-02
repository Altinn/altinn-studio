import React, { createRef } from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import type { DeleteModalProps } from './DeleteModal';
import { DeleteModal } from './DeleteModal';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';

const mockApp: string = 'TestApp';
const mockOrg: string = 'TestOrg';

const defaultProps: DeleteModalProps = {
  app: mockApp,
  org: mockOrg,
};

describe('DeleteModal', () => {
  afterEach(jest.clearAllMocks);

  it('Closes the dialog when the Cancel button is clicked', async () => {
    const user = userEvent.setup();
    await renderDeleteModal();
    const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await user.click(cancelButton);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('updates the value of the text field when typing', async () => {
    const user = userEvent.setup();
    await renderDeleteModal();
    expect(getNameField()).toHaveValue('');
    await user.type(getNameField(), 'a');
    expect(getNameField()).toHaveValue('a');
  });

  it('calls the handleDelete function when the Delete button is clicked with a matching app name', async () => {
    const user = userEvent.setup();
    const mockDelete = jest.fn().mockImplementation(() => Promise.resolve());
    await renderDeleteModal({ resetRepoChanges: mockDelete });
    expect(getDeleteButton()).toBeDisabled();
    await user.type(getNameField(), mockApp);
    expect(getDeleteButton()).not.toBeDisabled();
    expect(mockDelete).toHaveBeenCalledTimes(0);
    await user.click(getDeleteButton());
    expect(mockDelete).toHaveBeenCalledTimes(1);
    const toastSuccessText = await screen.findByText(successMessage);
    expect(toastSuccessText).toBeInTheDocument();
  });

  it('does not call the onClose function when the Delete button is clicked and an error is received', async () => {
    const user = userEvent.setup();
    const mockDelete = jest.fn().mockImplementation(() => Promise.reject());
    await renderDeleteModal({ resetRepoChanges: mockDelete });
    expect(getDeleteButton()).toBeDisabled();
    await user.type(getNameField(), mockApp);
    expect(getDeleteButton()).not.toBeDisabled();
    expect(mockDelete).toHaveBeenCalledTimes(0);
    await user.click(getDeleteButton());
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});

const renderDeleteModal = async (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
): Promise<RenderResult> => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };
  const ref = createRef<HTMLDialogElement>();
  // eslint-disable-next-line testing-library/render-result-naming-convention
  const renderResult = render(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <DeleteModal {...defaultProps} ref={ref} />
    </ServicesContextProvider>,
  );
  ref.current?.showModal();
  await screen.findByRole('dialog');
  return renderResult;
};

const getNameField = () => getTextbox(nameFieldLabel);
const getTextbox = (name: string) => screen.getByRole('textbox', { name });

const getDeleteButton = () => getButton(deleteButtonName);
const getButton = (name: string) => screen.getByRole('button', { name });

const nameFieldLabel = textMock('local_changes.modal_delete_modal_textfield_label');
const deleteButtonName = textMock('local_changes.modal_confirm_delete_button');
const successMessage = textMock('local_changes.modal_deleted_success');
