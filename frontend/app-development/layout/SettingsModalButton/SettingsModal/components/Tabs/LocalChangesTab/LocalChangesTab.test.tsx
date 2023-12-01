import React from 'react';
import { act, render as rtlRender, screen } from '@testing-library/react';
import { LocalChangesTab, LocalChangesTabProps } from './LocalChangesTab';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { QueryClient, UseMutationResult } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { useResetRepositoryMutation } from 'app-development/hooks/mutations/useResetRepositoryMutation';
import { repoDownloadPath } from 'app-shared/api/paths';

const mockApp: string = 'app';
const mockOrg: string = 'org';

jest.mock('../../../../../../hooks/mutations/useResetRepositoryMutation');
const deleteLocalChangesMutation = jest.fn();
const mockDeleteLocalChangesyMutation = useResetRepositoryMutation as jest.MockedFunction<
  typeof useResetRepositoryMutation
>;
mockDeleteLocalChangesyMutation.mockReturnValue({
  mutate: deleteLocalChangesMutation,
} as unknown as UseMutationResult<any, Error, void, unknown>);

describe('LocalChangesTab', () => {
  const user = userEvent.setup();
  afterEach(jest.clearAllMocks);

  const defaultProps: LocalChangesTabProps = {
    org: mockOrg,
    app: mockApp,
  };

  it('renders the component with the href for downloading only files that you have changes', () => {
    render({}, createQueryClientMock(), defaultProps);

    const hrefToOnlyFilesYouHaveChanged = repoDownloadPath(mockOrg, mockApp);

    const downloadOnlyChangedFilesLink = screen.getByRole('link', {
      name: textMock('settings_modal.local_changes_tab_download_only_changed_button'),
    });
    expect(downloadOnlyChangedFilesLink).toHaveAttribute('href', hrefToOnlyFilesYouHaveChanged);
  });

  it('renders the component with the href for downloading all files in the repo', () => {
    render({}, createQueryClientMock(), defaultProps);

    const hrefToAllFilesInRepo = repoDownloadPath(mockOrg, mockApp, true);

    const downloadOnlyChangedFilesLink = screen.getByRole('link', {
      name: textMock('settings_modal.local_changes_tab_download_all_button'),
    });
    expect(downloadOnlyChangedFilesLink).toHaveAttribute('href', hrefToAllFilesInRepo);
  });

  it('does not show the delete modal when initially rendering the component', () => {
    render({}, createQueryClientMock(), defaultProps);

    const deleteModalHeading = screen.queryByRole('heading', {
      name: textMock('settings_modal.local_changes_tab_delete_modal_title'),
      level: 1,
    });
    expect(deleteModalHeading).not.toBeInTheDocument();
  });

  it('opens the delete modal when delete button is clicked', async () => {
    render({}, createQueryClientMock(), defaultProps);

    const deleteButton = screen.getByRole('button', {
      name: textMock('settings_modal.local_changes_tab_delete_button'),
    });
    await act(() => user.click(deleteButton));

    const deleteModalHeading = screen.getByRole('heading', {
      name: textMock('settings_modal.local_changes_tab_delete_modal_title'),
      level: 1,
    });
    expect(deleteModalHeading).toBeInTheDocument();
  });

  it('calls the handleDelete function, and closes the modal, when delete button is clicked in delete modal', async () => {
    render({}, createQueryClientMock(), defaultProps);

    const deleteButton = screen.getByRole('button', {
      name: textMock('settings_modal.local_changes_tab_delete_button'),
    });
    await act(() => user.click(deleteButton));

    const deleteModalDeleteButton = screen.getByRole('button', {
      name: textMock('settings_modal.local_changes_tab_delete_modal_delete_button'),
    });
    expect(deleteModalDeleteButton).toBeDisabled();

    const textfield = screen.getByLabelText(
      textMock('settings_modal.local_changes_tab_delete_modal_textfield_label'),
    );
    await act(() => user.type(textfield, mockApp));

    const deleteModalDeleteButtonAfterTyping = screen.getByRole('button', {
      name: textMock('settings_modal.local_changes_tab_delete_modal_delete_button'),
    });
    expect(deleteModalDeleteButton).not.toBeDisabled();
    await act(() => user.click(deleteModalDeleteButtonAfterTyping));

    expect(deleteLocalChangesMutation).toHaveBeenCalledTimes(1);
  });

  it('closes the delete modal when cancel button is clicked in delete modal', async () => {
    render({}, createQueryClientMock(), defaultProps);

    const deleteButton = screen.getByRole('button', {
      name: textMock('settings_modal.local_changes_tab_delete_button'),
    });
    await act(() => user.click(deleteButton));

    const deleteModalHeading = screen.getByRole('heading', {
      name: textMock('settings_modal.local_changes_tab_delete_modal_title'),
      level: 1,
    });
    expect(deleteModalHeading).toBeInTheDocument();

    const deleteModalCancelButton = screen.getByRole('button', {
      name: textMock('general.cancel'),
    });
    await act(() => user.click(deleteModalCancelButton));

    const deleteModalHeadingAfterClose = screen.queryByRole('heading', {
      name: textMock('settings_modal.local_changes_tab_delete_modal_title'),
      level: 1,
    });
    expect(deleteModalHeadingAfterClose).not.toBeInTheDocument();
  });
});

const render = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
  props: LocalChangesTabProps,
) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return rtlRender(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <LocalChangesTab {...props} />
    </ServicesContextProvider>,
  );
};
