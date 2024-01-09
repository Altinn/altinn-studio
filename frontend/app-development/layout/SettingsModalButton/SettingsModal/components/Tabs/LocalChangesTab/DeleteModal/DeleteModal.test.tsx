import React from 'react';
import { act, render as rtlRender, screen } from '@testing-library/react';
import { DeleteModal, DeleteModalProps } from './DeleteModal';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { QueryClient, UseMutationResult } from '@tanstack/react-query';
import { useResetRepositoryMutation } from 'app-development/hooks/mutations/useResetRepositoryMutation';

const mockApp: string = 'TestApp';
const mockOrg: string = 'TestOrg';

jest.mock('../../../../../../../hooks/mutations/useResetRepositoryMutation');
const deleteLocalChangesMutation = jest.fn();
const mockDeleteLocalChangesyMutation = useResetRepositoryMutation as jest.MockedFunction<
  typeof useResetRepositoryMutation
>;
mockDeleteLocalChangesyMutation.mockReturnValue({
  mutate: deleteLocalChangesMutation,
} as unknown as UseMutationResult<any, Error, void, unknown>);

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
    render();

    const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await act(() => user.click(cancelButton));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('updates the value of the text field when typing', async () => {
    const user = userEvent.setup();
    render();

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

  it('calls the handleDelete function when the Delete button is clicked with a matching app name', async () => {
    const user = userEvent.setup();
    render();

    const deleteButton = screen.getByRole('button', {
      name: textMock('settings_modal.local_changes_tab_delete_modal_delete_button'),
    });
    expect(deleteButton).toBeDisabled();

    const textfield = screen.getByLabelText(
      textMock('settings_modal.local_changes_tab_delete_modal_textfield_label'),
    );
    await act(() => user.type(textfield, mockApp));

    const deleteButtonAfterTypedInName = screen.getByRole('button', {
      name: textMock('settings_modal.local_changes_tab_delete_modal_delete_button'),
    });
    expect(deleteButtonAfterTypedInName).not.toBeDisabled();

    await act(() => user.click(deleteButton));
    expect(deleteLocalChangesMutation).toHaveBeenCalledTimes(1);
  });
});

const render = (
  props: Partial<DeleteModalProps> = {},
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return rtlRender(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <DeleteModal {...defaultProps} {...props} />
    </ServicesContextProvider>,
  );
};
