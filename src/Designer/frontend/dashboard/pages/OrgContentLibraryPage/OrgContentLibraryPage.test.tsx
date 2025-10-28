import React from 'react';
import { OrgContentLibraryPage } from './OrgContentLibraryPage';
import type { RenderResult } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ProviderData } from '../../testing/mocks';
import { renderWithProviders } from '../../testing/mocks';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type {
  ContentLibraryConfig,
  PagesConfig,
  ResourceContentLibraryImpl,
  TextResourceWithLanguage,
  TextResources,
} from '@studio/content-library';
import { SelectedContextType } from '../../enums/SelectedContextType';
import { Route, Routes } from 'react-router-dom';
import { codeList1Data, codeListDataList } from './test-data/codeListDataList';
import { repoStatus } from 'app-shared/mocks/mocks';
import {
  label1ResourceNb,
  textResources,
  textResourcesWithLanguage,
} from './test-data/textResources';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import userEvent from '@testing-library/user-event';

// Test data:
const orgName: string = 'org';
const orgPath = '/' + orgName;
const defaultProviderData: ProviderData = {
  initialEntries: [orgPath],
};
const repositoryName = `${orgName}-content`;
const repoStatusQueryKey: string[] = [QueryKey.RepoStatus, orgName, repositoryName];
const orgCodeListsQueryKey: string[] = [QueryKey.OrgCodeLists, orgName];
const orgTextResourcesQueryKey: string[] = [QueryKey.OrgTextResources, orgName, DEFAULT_LANGUAGE];

// Mocks:
jest.mock('@studio/content-library', () => ({
  ...jest.requireActual('@studio/content-library'),
  ResourceContentLibraryImpl: mockContentLibrary,
}));

function mockContentLibrary(
  ...args: ConstructorParameters<typeof ResourceContentLibraryImpl>
): Partial<ResourceContentLibraryImpl> {
  mockConstructor(...args);
  return { getContentResourceLibrary };
}

const mockConstructor = jest.fn();
const getContentResourceLibrary = jest
  .fn()
  .mockImplementation(() => <div data-testid={resourceLibraryTestId} />);
const resourceLibraryTestId = 'resource-library';

jest.mock('react-router-dom', () => jest.requireActual('react-router-dom')); // Todo: Remove this when we have removed the global mock: https://github.com/Altinn/altinn-studio/issues/14597

describe('OrgContentLibraryPage', () => {
  beforeEach(mockConstructor.mockClear);

  it('Renders the content library', () => {
    renderOrgContentLibraryWithData();
    expect(screen.getByTestId(resourceLibraryTestId)).toBeInTheDocument();
  });

  it('renders a spinner while waiting for repo status', () => {
    renderOrgContentLibrary();
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('renders a spinner while waiting for code lists', () => {
    renderOrgContentLibraryWithRepoStatus();
    expect(screen.getByLabelText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('Renders an error message when the code lists query fails', async () => {
    const getOrgCodeLists = () => Promise.reject(new Error('Test error'));
    renderOrgContentLibrary({ queries: { getOrgCodeLists } });
    await waitFor(expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument);

    const errorMessage = textMock('dashboard.org_library.fetch_error');
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it.each([SelectedContextType.None, SelectedContextType.All, SelectedContextType.Self])(
    'renders alert and omits library content when context is %s',
    (selectedContext) => {
      renderOrgContentLibrary({ initialEntries: ['/' + selectedContext] });

      const noOrgSelectedMessage = textMock('dashboard.org_library.alert_no_org_selected');
      expect(screen.getByText(noOrgSelectedMessage)).toBeInTheDocument();
      expect(screen.queryByTestId(resourceLibraryTestId)).not.toBeInTheDocument();
    },
  );

  it('Renders with the given code lists', () => {
    renderOrgContentLibraryWithData();
    const renderedList = retrievePagesConfig().codeListsWithTextResources.props.codeListDataList;
    expect(renderedList).toEqual(codeListDataList);
  });

  it('Renders with the given text resources', () => {
    renderOrgContentLibraryWithData();
    const textResourcesData = retrievePagesConfig().codeListsWithTextResources.props.textResources;
    expect(textResourcesData).toEqual(textResources);
  });

  it('Renders with fallback text resources when text resources are missing', () => {
    renderOrgContentLibraryWithMissingTextResources();
    const textResourcesData = retrievePagesConfig().codeListsWithTextResources.props.textResources;
    const expectedTextResources: TextResources = {
      [DEFAULT_LANGUAGE]: [],
    };
    expect(textResourcesData).toEqual(expectedTextResources);
  });

  it('calls updateOrgCodeList with correct data when onUpdateCodeList is triggered', async () => {
    const updateOrgCodeList = jest.fn();
    renderOrgContentLibraryWithData({ queries: { updateOrgCodeList } });
    const { title, data } = codeList1Data;

    retrievePagesConfig().codeListsWithTextResources.props.onUpdateCodeList({
      title,
      codeList: data,
    });
    await waitFor(expect(updateOrgCodeList).toHaveBeenCalled);

    expect(updateOrgCodeList).toHaveBeenCalledTimes(1);
    expect(updateOrgCodeList).toHaveBeenCalledWith(orgName, title, data);
  });

  it('calls updateOrgCodeListId with correct data when onUpdateCodeListId is triggered', async () => {
    const updateOrgCodeListId = jest.fn();
    renderOrgContentLibraryWithData({ queries: { updateOrgCodeListId } });
    const codeListId: string = codeList1Data.title;
    const newCodeListId: string = 'new-id';

    retrievePagesConfig().codeListsWithTextResources.props.onUpdateCodeListId(
      codeListId,
      newCodeListId,
    );
    await waitFor(expect(updateOrgCodeListId).toHaveBeenCalled);

    expect(updateOrgCodeListId).toHaveBeenCalledTimes(1);
    expect(updateOrgCodeListId).toHaveBeenCalledWith(orgName, codeListId, newCodeListId);
  });

  it('calls createOrgCodeList with correct data when onCreateCodeList is triggered', async () => {
    const createOrgCodeList = jest.fn();
    renderOrgContentLibraryWithData({ queries: { createOrgCodeList } });
    const { title, data } = codeList1Data;

    retrievePagesConfig().codeListsWithTextResources.props.onCreateCodeList({
      title,
      codeList: data,
    });
    await waitFor(expect(createOrgCodeList).toHaveBeenCalled);

    expect(createOrgCodeList).toHaveBeenCalledTimes(1);
    expect(createOrgCodeList).toHaveBeenCalledWith(orgName, title, data);
  });

  it('calls uploadOrgCodeList with correct data when onUploadCodeList is triggered', async () => {
    const uploadOrgCodeList = jest.fn();
    const file = new File([''], 'list.json');
    renderOrgContentLibraryWithData({ queries: { uploadOrgCodeList } });

    retrievePagesConfig().codeListsWithTextResources.props.onUploadCodeList(file);
    await waitFor(expect(uploadOrgCodeList).toHaveBeenCalled);

    expect(uploadOrgCodeList).toHaveBeenCalledTimes(1);
    expect(uploadOrgCodeList).toHaveBeenCalledWith(orgName, expect.any(FormData));
    const formData: FormData = uploadOrgCodeList.mock.calls[0][1];
    expect(formData.get('file')).toBe(file);
  });

  it('renders success toast when uploadOrgCodeList is run successfully', async () => {
    const uploadOrgCodeList = jest.fn();
    const file = new File([''], 'list.json');
    renderOrgContentLibraryWithData({ queries: { uploadOrgCodeList } });

    retrievePagesConfig().codeListsWithTextResources.props.onUploadCodeList(file);
    await waitFor(expect(uploadOrgCodeList).toHaveBeenCalled);

    const successMessage = textMock('dashboard.org_library.code_list_upload_success');
    expect(screen.getByText(successMessage)).toBeInTheDocument();
  });

  it('renders error toast when onUploadCodeList is rejected with unknown error code', async () => {
    const uploadOrgCodeList = jest.fn().mockImplementation(() => Promise.reject({ response: {} }));
    const file = new File([''], 'list.json');
    renderOrgContentLibraryWithData({ queries: { uploadOrgCodeList } });

    retrievePagesConfig().codeListsWithTextResources.props.onUploadCodeList(file);
    await waitFor(expect(uploadOrgCodeList).toHaveBeenCalled);

    const errorMessage = textMock('dashboard.org_library.code_list_upload_generic_error');
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('calls deleteOrgCodeList with correct data when onDeleteCodeList is triggered', async () => {
    const deleteOrgCodeList = jest.fn();
    renderOrgContentLibraryWithData({ queries: { deleteOrgCodeList } });

    retrievePagesConfig().codeListsWithTextResources.props.onDeleteCodeList(codeList1Data.title);
    await waitFor(expect(deleteOrgCodeList).toHaveBeenCalled);

    expect(deleteOrgCodeList).toHaveBeenCalledTimes(1);
    expect(deleteOrgCodeList).toHaveBeenCalledWith(orgName, codeList1Data.title);
  });

  it('Calls updateOrgTextResources with correct data when onUpdateTextResource is triggered', async () => {
    const language = 'nb';
    const textResource = label1ResourceNb;
    const textResourceWithLanguage: TextResourceWithLanguage = { language, textResource };
    renderOrgContentLibraryWithData();

    retrievePagesConfig().codeListsWithTextResources.props.onUpdateTextResource(
      textResourceWithLanguage,
    );
    await waitFor(expect(queriesMock.updateOrgTextResources).toHaveBeenCalled);

    expect(queriesMock.updateOrgTextResources).toHaveBeenCalledTimes(1);
    const expectedPayload: KeyValuePairs<string> = { [textResource.id]: textResource.value };
    expect(queriesMock.updateOrgTextResources).toHaveBeenCalledWith(
      orgName,
      language,
      expectedPayload,
    );
  });

  it('renders merge conflict warning when there is a merge conflict', async () => {
    const getRepoStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ ...repoStatus, hasMergeConflict: true }));

    renderOrgContentLibrary({ queries: { getRepoStatus } });
    await waitFor(expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument);

    const mergeConflictWarning = screen.getByRole('heading', {
      name: textMock('merge_conflict.headline'),
      level: 1,
    });
    expect(mergeConflictWarning).toBeInTheDocument();
  });

  it('does not render merge conflict warning when there is no merge conflict', async () => {
    const getRepoStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ ...repoStatus, hasMergeConflict: false }));

    renderOrgContentLibrary({ queries: { getRepoStatus } });
    await waitFor(expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument);

    const mergeConflictWarning = screen.queryByRole('heading', {
      name: textMock('merge_conflict.headline'),
      level: 1,
    });
    expect(mergeConflictWarning).not.toBeInTheDocument();
  });

  it('Displays the feedback button', () => {
    renderOrgContentLibraryWithData();
    const feedbackButton = screen.getByRole('button', { name: /Gi tilbakemelding/ });
    expect(feedbackButton).toBeInTheDocument();
  });

  it('Displays a dialog when the feedback button is clicked', async () => {
    const user = userEvent.setup();
    renderOrgContentLibraryWithData();
    await user.click(screen.getByRole('button', { name: /Gi tilbakemelding/ }));
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: /Gi tilbakemelding om biblioteket/ }),
    ).toBeInTheDocument();
  });

  it('Renders with the organisation library heading', () => {
    renderOrgContentLibraryWithData();
    expect(retrieveConfig().heading).toBe(textMock('org_content_library.library_heading'));
  });
});

function renderOrgContentLibraryWithData(providerData: ProviderData = {}): void {
  const queryClient = createQueryClientWithData();
  renderOrgContentLibrary({ ...providerData, queryClient });
}

function createQueryClientWithData(): QueryClient {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(orgCodeListsQueryKey, codeListDataList);
  queryClient.setQueryData(orgTextResourcesQueryKey, textResourcesWithLanguage);
  queryClient.setQueryData(repoStatusQueryKey, repoStatus);
  return queryClient;
}

function renderOrgContentLibraryWithMissingTextResources(): void {
  const queryClient = createQueryClientWithMissingTextResources();
  renderOrgContentLibrary({ queryClient });
}

function createQueryClientWithMissingTextResources(): QueryClient {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(orgCodeListsQueryKey, codeListDataList);
  queryClient.setQueryData(orgTextResourcesQueryKey, null);
  queryClient.setQueryData(repoStatusQueryKey, repoStatus);
  return queryClient;
}

function renderOrgContentLibraryWithRepoStatus(): void {
  const queryClient = createQueryClientWithRepoStatus();
  renderOrgContentLibrary({ queryClient });
}

function createQueryClientWithRepoStatus(): QueryClient {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(repoStatusQueryKey, repoStatus);
  return queryClient;
}

function renderOrgContentLibrary(providerData: ProviderData = {}): RenderResult {
  return renderWithProviders(
    <Routes>
      <Route path=':selectedContext' element={<OrgContentLibraryPage />} />
    </Routes>,
    { ...defaultProviderData, ...providerData },
  );
}

function retrievePagesConfig(): PagesConfig {
  return retrieveConfig().pages;
}

function retrieveConfig(): ContentLibraryConfig {
  return mockConstructor.mock.calls[0][0];
}
