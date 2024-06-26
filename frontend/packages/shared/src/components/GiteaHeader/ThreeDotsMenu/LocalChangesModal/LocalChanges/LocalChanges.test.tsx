import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { LocalChanges } from './LocalChanges';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { QueryClient, UseMutationResult } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { useResetRepositoryMutation } from 'app-development/hooks/mutations/useResetRepositoryMutation';
import { repoDownloadPath } from 'app-shared/api/paths';
import { app, org } from '@studio/testing/testids';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => {
    return { org, app };
  },
}));

jest.mock('app-development/hooks/mutations/useResetRepositoryMutation');
const deleteLocalChangesMutation = jest.fn();
const mockDeleteLocalChangesyMutation = useResetRepositoryMutation as jest.MockedFunction<
  typeof useResetRepositoryMutation
>;
mockDeleteLocalChangesyMutation.mockReturnValue({
  mutate: deleteLocalChangesMutation,
} as unknown as UseMutationResult<any, Error, void, unknown>);

describe('LocalChanges', () => {
  afterEach(jest.clearAllMocks);

  it('renders the component with the href for downloading only files that you have changes', () => {
    render({}, createQueryClientMock());

    const hrefToOnlyFilesYouHaveChanged = repoDownloadPath(org, app);

    const downloadOnlyChangedFilesLink = screen.getByRole('link', {
      name: textMock('local_changes.modal_download_only_changed_button'),
    });
    expect(downloadOnlyChangedFilesLink).toHaveAttribute('href', hrefToOnlyFilesYouHaveChanged);
  });

  it('renders the component with the href for downloading all files in the repo', () => {
    render({}, createQueryClientMock());

    const hrefToAllFilesInRepo = repoDownloadPath(org, app, true);

    const downloadOnlyChangedFilesLink = screen.getByRole('link', {
      name: textMock('local_changes_modal.download_all_button'),
    });
    expect(downloadOnlyChangedFilesLink).toHaveAttribute('href', hrefToAllFilesInRepo);
  });

  it('does not show the delete modal when initially rendering the component', () => {
    render({}, createQueryClientMock());

    const deleteModalHeading = screen.queryByRole('heading', {
      name: textMock('local_changes.modal_delete_modal_title'),
      level: 1,
    });
    expect(deleteModalHeading).not.toBeInTheDocument();
  });

  it('opens the delete modal when delete button is clicked', async () => {
    const user = userEvent.setup();
    render({}, createQueryClientMock());

    const deleteButton = screen.getByRole('button', {
      name: textMock('local_changes.modal_delete_button'),
    });
    await user.click(deleteButton);

    const deleteModalHeading = screen.getByRole('heading', {
      name: textMock('local_changes.modal_delete_modal_title'),
      level: 1,
    });
    expect(deleteModalHeading).toBeInTheDocument();
  });

  it('calls the handleDelete function, and closes the modal, when delete button is clicked in delete modal', async () => {
    const user = userEvent.setup();
    render({}, createQueryClientMock());

    const deleteButton = screen.getByRole('button', {
      name: textMock('local_changes.modal_delete_button'),
    });
    await user.click(deleteButton);

    const deleteModalDeleteButton = screen.getByRole('button', {
      name: textMock('local_changes.modal_confirm_delete_button'),
    });
    expect(deleteModalDeleteButton).toBeDisabled();

    const textfield = screen.getByLabelText(
      textMock('local_changes.modal_delete_modal_textfield_label'),
    );
    await user.type(textfield, app);

    const deleteModalDeleteButtonAfterTyping = screen.getByRole('button', {
      name: textMock('local_changes.modal_confirm_delete_button'),
    });
    expect(deleteModalDeleteButton).not.toBeDisabled();
    await user.click(deleteModalDeleteButtonAfterTyping);

    expect(deleteLocalChangesMutation).toHaveBeenCalledTimes(1);
  });

  it('closes the delete modal when cancel button is clicked in delete modal', async () => {
    const user = userEvent.setup();
    render({}, createQueryClientMock());

    const deleteButton = screen.getByRole('button', {
      name: textMock('local_changes.modal_delete_button'),
    });
    await user.click(deleteButton);

    const deleteModalHeading = screen.getByRole('heading', {
      name: textMock('local_changes.modal_delete_modal_title'),
      level: 1,
    });
    expect(deleteModalHeading).toBeInTheDocument();

    const deleteModalCancelButton = screen.getByRole('button', {
      name: textMock('general.cancel'),
    });
    await user.click(deleteModalCancelButton);

    const deleteModalHeadingAfterClose = screen.queryByRole('heading', {
      name: textMock('local_changes.modal_delete_modal_title'),
      level: 1,
    });
    expect(deleteModalHeadingAfterClose).not.toBeInTheDocument();
  });
});

const render = (
  allQueries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  return rtlRender(
    <ServicesContextProvider {...allQueries} client={queryClient}>
      <LocalChanges />
    </ServicesContextProvider>,
  );
};
