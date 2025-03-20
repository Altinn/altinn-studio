import React from 'react';
import { OrgContentLibrary } from './OrgContentLibrary';
import type { RenderResult } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ProviderData } from '../../testing/mocks';
import { renderWithProviders } from '../../testing/mocks';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type {
  PagesConfig,
  ResourceContentLibraryImpl,
  TextResourceWithLanguage,
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
import type { ITextResource } from 'app-shared/types/global';

// Test data:
const orgName: string = 'org';
const orgPath = '/' + orgName;
const defaultProviderData: ProviderData = {
  initialEntries: [orgPath],
};

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

describe('OrgContentLibrary', () => {
  beforeEach(mockConstructor.mockClear);

  it('Renders the content library', async () => {
    renderOrgContentLibraryWithData();
    expect(screen.getByTestId(resourceLibraryTestId)).toBeInTheDocument();
  });

  it('renders a spinner while waiting for code lists', () => {
    renderOrgContentLibrary();
    expect(screen.getByTitle(textMock('general.loading'))).toBeInTheDocument();
  });

  it('Renders an error message when the code lists query fails', async () => {
    const getCodeListsForOrg = () => Promise.reject(new Error('Test error'));
    renderOrgContentLibrary({ queries: { getCodeListsForOrg } });
    await waitFor(expect(screen.queryByTitle(textMock('general.loading'))).not.toBeInTheDocument);

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
    const renderedList = retrieveConfig().codeList.props.codeListsData;
    expect(renderedList).toEqual(codeListDataList);
  });

  it('Renders with the given text resources', () => {
    renderOrgContentLibraryWithData();
    const textResourcesData = retrieveConfig().codeList.props.textResources;
    expect(textResourcesData).toEqual(textResources);
  });

  it('calls updateCodeListForOrg with correct data when onUpdateCodeList is triggered', async () => {
    const updateCodeListForOrg = jest.fn();
    renderOrgContentLibraryWithData({ queries: { updateCodeListForOrg } });
    const { title, data } = codeList1Data;

    retrieveConfig().codeList.props.onUpdateCodeList({ title, codeList: data });
    await waitFor(expect(updateCodeListForOrg).toHaveBeenCalled);

    expect(updateCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(updateCodeListForOrg).toHaveBeenCalledWith(orgName, title, data);
  });

  it('calls uploadCodeListForOrg with correct data when onUploadCodeList is triggered', async () => {
    const uploadCodeListForOrg = jest.fn();
    const file = new File([''], 'list.json');
    renderOrgContentLibraryWithData({ queries: { uploadCodeListForOrg } });

    retrieveConfig().codeList.props.onUploadCodeList(file);
    await waitFor(expect(uploadCodeListForOrg).toHaveBeenCalled);

    expect(uploadCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(uploadCodeListForOrg).toHaveBeenCalledWith(orgName, expect.any(FormData));
    const formData: FormData = uploadCodeListForOrg.mock.calls[0][1];
    expect(formData.get('file')).toBe(file);
  });

  it('renders success toast when uploadCodeListForOrg is run successfully', async () => {
    const uploadCodeListForOrg = jest.fn();
    const file = new File([''], 'list.json');
    renderOrgContentLibraryWithData({ queries: { uploadCodeListForOrg } });

    retrieveConfig().codeList.props.onUploadCodeList(file);
    await waitFor(expect(uploadCodeListForOrg).toHaveBeenCalled);

    const successMessage = textMock('dashboard.org_library.code_list_upload_success');
    expect(screen.getByText(successMessage)).toBeInTheDocument();
  });

  it('renders error toast when onUploadCodeList is rejected with unknown error code', async () => {
    const uploadCodeListForOrg = jest
      .fn()
      .mockImplementation(() => Promise.reject({ response: {} }));
    const file = new File([''], 'list.json');
    renderOrgContentLibraryWithData({ queries: { uploadCodeListForOrg } });

    retrieveConfig().codeList.props.onUploadCodeList(file);
    await waitFor(expect(uploadCodeListForOrg).toHaveBeenCalled);

    const errorMessage = textMock('dashboard.org_library.code_list_upload_generic_error');
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('calls deleteCodeListForOrg with correct data when onDeleteCodeList is triggered', async () => {
    const deleteCodeListForOrg = jest.fn();
    renderOrgContentLibraryWithData({ queries: { deleteCodeListForOrg } });

    retrieveConfig().codeList.props.onDeleteCodeList(codeList1Data.title);
    await waitFor(expect(deleteCodeListForOrg).toHaveBeenCalled);

    expect(deleteCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(deleteCodeListForOrg).toHaveBeenCalledWith(orgName, codeList1Data.title);
  });

  it('Calls updateTextResourcesForOrg with correct data when onUpdateTextResource is triggered', async () => {
    const language = 'nb';
    const textResource = label1ResourceNb;
    const textResourceWithLanguage: TextResourceWithLanguage = { language, textResource };
    renderOrgContentLibraryWithData();

    retrieveConfig().codeList.props.onUpdateTextResource(textResourceWithLanguage);
    await waitFor(expect(queriesMock.updateTextResourcesForOrg).toHaveBeenCalled);

    expect(queriesMock.updateTextResourcesForOrg).toHaveBeenCalledTimes(1);
    const expectedPayload: ITextResource[] = [textResource];
    expect(queriesMock.updateTextResourcesForOrg).toHaveBeenCalledWith(
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
    await waitFor(expect(screen.queryByTitle(textMock('general.loading'))).not.toBeInTheDocument);

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
    await waitFor(expect(screen.queryByTitle(textMock('general.loading'))).not.toBeInTheDocument);

    const mergeConflictWarning = screen.queryByRole('heading', {
      name: textMock('merge_conflict.headline'),
      level: 1,
    });
    expect(mergeConflictWarning).not.toBeInTheDocument();
  });
});

function renderOrgContentLibraryWithData(providerData: ProviderData = {}): void {
  const queryClient = createQueryClientWithData();
  renderOrgContentLibrary({ ...providerData, queryClient });
}

function createQueryClientWithData(): QueryClient {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.OrgCodeLists, orgName], codeListDataList);
  queryClient.setQueryData(
    [QueryKey.TextResourcesForOrg, orgName, DEFAULT_LANGUAGE],
    textResourcesWithLanguage,
  );
  return queryClient;
}

function renderOrgContentLibrary(providerData: ProviderData = {}): RenderResult {
  return renderWithProviders(
    <Routes>
      <Route path=':selectedContext' element={<OrgContentLibrary />} />
    </Routes>,
    { ...defaultProviderData, ...providerData },
  );
}

function retrieveConfig(): PagesConfig {
  return mockConstructor.mock.calls[0][0].pages;
}
