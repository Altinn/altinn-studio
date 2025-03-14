import React from 'react';
import type { ByRoleOptions } from '@testing-library/react';
import { screen } from '@testing-library/react';
import { LocalChanges } from './LocalChanges';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { repoDownloadPath } from 'app-shared/api/paths';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';
import { renderWithProviders } from 'app-shared/components/GiteaHeader/mocks/renderWithProviders';

const onDelete = jest.fn();

describe('LocalChanges', () => {
  afterEach(jest.clearAllMocks);

  it('renders the component with the href for downloading only files that the user has changed', () => {
    renderLocalChanges();
    const hrefToOnlyChangedFiles = repoDownloadPath(org, app);
    expect(getDownloadChangedOnlyLink()).toHaveAttribute('href', hrefToOnlyChangedFiles);
  });

  it('renders the component with the href for downloading all files in the repo', () => {
    renderLocalChanges();
    const hrefToAllFilesInRepo = repoDownloadPath(org, app, true);
    expect(getDownloadAllLink()).toHaveAttribute('href', hrefToAllFilesInRepo);
  });

  it('does not show the delete modal when initially rendering the component', () => {
    renderLocalChanges();
    expect(queryDeleteModalHeading()).not.toBeInTheDocument();
  });

  it('opens the delete modal when delete button is clicked', async () => {
    const user = userEvent.setup();
    renderLocalChanges();
    await user.click(getDeleteButton());
    expect(getDeleteModalHeading()).toBeInTheDocument();
  });

  it('calls the delete mutation query when delete button is clicked in the delete modal', async () => {
    const user = userEvent.setup();
    renderLocalChanges();
    await user.click(getDeleteButton());
    expect(getConfirmDeleteButton()).toBeDisabled();
    await user.type(getDeleteTextfield(), app);
    expect(getConfirmDeleteButton()).not.toBeDisabled();
    await user.click(getConfirmDeleteButton());
    expect(queriesMock.resetRepoChanges).toHaveBeenCalledTimes(1);
  });

  it('Closes the dialog when the deletion is done', async () => {
    const user = userEvent.setup();
    renderLocalChanges();
    await user.click(getDeleteButton());
    await user.type(getDeleteTextfield(), app);
    await user.click(getConfirmDeleteButton());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Calls the onDelete function when the deletion is done', async () => {
    const user = userEvent.setup();
    renderLocalChanges();
    await user.click(getDeleteButton());
    await user.type(getDeleteTextfield(), app);
    await user.click(getConfirmDeleteButton());
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('closes the delete modal when cancel button is clicked in delete modal', async () => {
    const user = userEvent.setup();
    renderLocalChanges();
    await user.click(getDeleteButton());
    expect(getDeleteModalHeading()).toBeInTheDocument();
    await user.click(getCancelButton());
    expect(queryDeleteModalHeading()).not.toBeInTheDocument();
  });
});

const renderLocalChanges = (
  allQueries: Partial<ServicesContextProps> = queriesMock,
  queryClient: QueryClient = createQueryClientMock(),
) => renderWithProviders(allQueries, queryClient)(<LocalChanges onDelete={onDelete} />);

const getDownloadChangedOnlyLink = () => getLink(downloadChangedOnlyLinkName);
const getDownloadAllLink = () => getLink(downloadAllLinkName);
const getLink = (name: string) => screen.getByRole('link', { name });

const getDeleteButton = () => getButton(deleteButtonName);
const getConfirmDeleteButton = () => getButton(confirmDeleteButtonName);
const getCancelButton = () => getButton(cancelButtonName);
const getButton = (name: string) => screen.getByRole('button', { name });

const getDeleteTextfield = () => getTextfield(deleteTextfieldLabel);
const getTextfield = (name: string) => screen.getByRole('textbox', { name });

const getDeleteModalHeading = () => screen.getByRole('heading', deleteModalHeadingOptions);
const queryDeleteModalHeading = () => screen.queryByRole('heading', deleteModalHeadingOptions);

const downloadChangedOnlyLinkName = textMock('local_changes.modal_download_only_changed_button');
const downloadAllLinkName = textMock('local_changes_modal.download_all_button');
const deleteButtonName = textMock('local_changes.modal_delete_button');
const confirmDeleteButtonName = textMock('local_changes.modal_confirm_delete_button');
const cancelButtonName = textMock('general.cancel');
const deleteModalHeading = textMock('local_changes.modal_delete_modal_title');
const deleteTextfieldLabel = textMock('local_changes.modal_delete_modal_textfield_label');

const deleteModalHeadingOptions: ByRoleOptions = { name: deleteModalHeading, level: 2 };
