import React, { createRef } from 'react';
import type { RenderResult } from '@testing-library/react';
import { screen } from '@testing-library/react';
import type { DeleteModalProps } from './DeleteModal';
import { DeleteModal } from './DeleteModal';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { renderWithProviders } from 'app-shared/components/GiteaHeader/mocks/renderWithProviders';
import { app, org } from '@studio/testing/testids';

const defaultProps: DeleteModalProps = {
  app: app,
  org: org,
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

  it('calls on a full refresh of the page when the delete button is clicked and deletion is a success', async () => {
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        reload: jest.fn(),
      },
      writable: true,
    });
    jest.spyOn(window.location, 'reload').mockImplementation(() => {});
    const user = userEvent.setup();
    await renderDeleteModal();
    expect(getDeleteButton()).toBeDisabled();
    await user.type(getNameField(), app);
    expect(getDeleteButton()).not.toBeDisabled();
    await user.click(getDeleteButton());
    expect(location.reload).toHaveBeenCalledTimes(1);
  });

  it('does not call the onClose function when the Delete button is clicked and an error is received', async () => {
    const user = userEvent.setup();
    const mockDelete = jest.fn().mockImplementation(() => Promise.reject());
    await renderDeleteModal({ resetRepoChanges: mockDelete });
    expect(getDeleteButton()).toBeDisabled();
    await user.type(getNameField(), app);
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
  const renderResult = renderWithProviders(
    allQueries,
    queryClient,
  )(<DeleteModal {...defaultProps} ref={ref} />);
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
