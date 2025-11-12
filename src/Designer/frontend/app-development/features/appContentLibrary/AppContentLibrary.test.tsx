import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { AppContentLibrary } from './AppContentLibrary';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../test/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import type {
  CodeListDataWithTextResources,
  CodeListWithMetadata,
  ContentLibraryConfig,
  PagesConfig,
  ResourceContentLibraryImpl,
  TextResourceWithLanguage,
} from '@studio/content-library';
import { optionList1Data, optionListDataList } from './test-data/optionListDataList';
import { label1ResourceNb, textResources } from './test-data/textResources';
import type { ITextResourcesObjectFormat } from 'app-shared/types/global';
import { codeListTitles } from './test-data/codeListTitles';

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

describe('AppContentLibrary', () => {
  afterEach(jest.clearAllMocks);

  it('Renders the content library', async () => {
    renderAppContentLibraryWithData();
    expect(screen.getByTestId(resourceLibraryTestId)).toBeInTheDocument();
  });

  it('renders a spinner when waiting for option lists', () => {
    renderAppContentLibrary();
    const spinner = screen.getByLabelText(textMock('general.loading'));
    expect(spinner).toBeInTheDocument();
  });

  it('Renders an error message when the option lists query fails', async () => {
    const getOptionLists = () => Promise.reject(new Error('Test error'));
    renderAppContentLibrary({ queries: { getOptionLists } });
    await waitFor(
      expect(screen.queryByLabelText(textMock('general.loading'))).not.toBeInTheDocument,
    );
    const errorMessage = screen.getByText(textMock('app_content_library.fetch_error'));
    expect(errorMessage).toBeInTheDocument();
  });

  it('Renders an error message when getAvailableResourcesFromOrg fails', async () => {
    const getAvailableResourcesFromOrg = () => Promise.reject(new Error('Test error'));
    renderAppContentLibrary({ queries: { getAvailableResourcesFromOrg } });
    await waitFor(
      expect(screen.queryByLabelText(textMock('general.loading'))).not.toBeInTheDocument,
    );
    const errorMessage = screen.getByText(textMock('app_content_library.fetch_error'));
    expect(errorMessage).toBeInTheDocument();
  });

  it('Renders with the given code lists', () => {
    renderAppContentLibraryWithData();
    const codeListDataList =
      retrievePagesConfig().codeListsWithTextResources.props.codeListDataList;
    const expectedData: CodeListDataWithTextResources[] = optionListDataList;
    expect(codeListDataList).toEqual(expectedData);
  });

  it('Renders with the given text resources', () => {
    renderAppContentLibraryWithData();
    const textResourcesData = retrievePagesConfig().codeListsWithTextResources.props.textResources;
    expect(textResourcesData).toEqual(textResources);
  });

  it('Renders with the given code list titles', () => {
    renderAppContentLibraryWithData();
    const codeListTitlesData =
      retrievePagesConfig().codeListsWithTextResources.props.externalResources;
    expect(codeListTitlesData).toEqual(codeListTitles);
  });

  it('calls uploadOptionList with correct data when onUploadCodeList is triggered', async () => {
    const uploadOptionList = jest.fn();
    const file = new File([''], 'list.json');
    renderAppContentLibraryWithData({ queries: { uploadOptionList } });

    retrievePagesConfig().codeListsWithTextResources.props.onUploadCodeList(file);
    await waitFor(expect(uploadOptionList).toHaveBeenCalled);

    expect(uploadOptionList).toHaveBeenCalledTimes(1);
    expect(uploadOptionList).toHaveBeenCalledWith(org, app, expect.any(FormData));
    const formData: FormData = uploadOptionList.mock.calls[0][2];
    expect(formData.get('file')).toBe(file);
  });

  it('renders success toast when onUploadOptionList is called successfully', async () => {
    renderAppContentLibraryWithData();
    const file = new File([''], 'list.json');

    retrievePagesConfig().codeListsWithTextResources.props.onUploadCodeList(file);
    await waitFor(expect(queriesMock.uploadOptionList).toHaveBeenCalled);

    const successMessage = textMock('ux_editor.modal_properties_code_list_upload_success');
    expect(screen.getByText(successMessage)).toBeInTheDocument();
  });

  it('renders error toast when onUploadOptionList is rejected with unknown error code', async () => {
    const uploadOptionList = jest.fn().mockImplementation(() => Promise.reject({ response: {} }));
    const file = new File([''], 'list.json');
    renderAppContentLibraryWithData({ queries: { uploadOptionList } });

    retrievePagesConfig().codeListsWithTextResources.props.onUploadCodeList(file);
    await waitFor(expect(uploadOptionList).toHaveBeenCalled);

    const errorMessage = textMock('ux_editor.modal_properties_code_list_upload_generic_error');
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('calls updateOptionList with correct data when onUpdateCodeList is triggered', async () => {
    const { title, data: codeList } = optionList1Data;
    const codeListWithMetadata: CodeListWithMetadata = { title, codeList };
    renderAppContentLibraryWithData();

    retrievePagesConfig().codeListsWithTextResources.props.onUpdateCodeList(codeListWithMetadata);
    await waitFor(expect(queriesMock.updateOptionList).toHaveBeenCalled);

    expect(queriesMock.updateOptionList).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateOptionList).toHaveBeenCalledWith(org, app, title, codeList);
  });

  it('calls updateOptionListId with correct data when onUpdateCodeListId is triggered', async () => {
    const { title: currentName } = optionList1Data;
    const newName = 'newName';
    renderAppContentLibraryWithData();

    retrievePagesConfig().codeListsWithTextResources.props.onUpdateCodeListId(currentName, newName);
    await waitFor(expect(queriesMock.updateOptionListId).toHaveBeenCalled);

    expect(queriesMock.updateOptionListId).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateOptionListId).toHaveBeenCalledWith(org, app, currentName, newName);
  });

  it('calls onUpdateOptionList with correct data when onCreateCodeList is triggered', async () => {
    const { title, data: codeList } = optionList1Data;
    const newCodeList: CodeListWithMetadata = { title, codeList };
    renderAppContentLibraryWithData();

    retrievePagesConfig().codeListsWithTextResources.props.onCreateCodeList(newCodeList);
    await waitFor(expect(queriesMock.updateOptionList).toHaveBeenCalled);

    expect(queriesMock.updateOptionList).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateOptionList).toHaveBeenCalledWith(org, app, title, codeList);
  });

  it('calls deleteOptionList with correct data when onDeleteCodeList is triggered', async () => {
    renderAppContentLibraryWithData();

    retrievePagesConfig().codeListsWithTextResources.props.onDeleteCodeList(optionList1Data.title);
    await waitFor(expect(queriesMock.deleteOptionList).toHaveBeenCalled);

    expect(queriesMock.deleteOptionList).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteOptionList).toHaveBeenCalledWith(org, app, optionList1Data.title);
  });

  it('Calls upsertTextResource with correct data when onUpdateTextResource is triggered', async () => {
    const language = 'nb';
    const textResource = label1ResourceNb;
    const textResourceWithLanguage: TextResourceWithLanguage = { language, textResource };
    renderAppContentLibraryWithData();

    retrievePagesConfig().codeListsWithTextResources.props.onUpdateTextResource(
      textResourceWithLanguage,
    );
    await waitFor(expect(queriesMock.upsertTextResources).toHaveBeenCalled);

    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(1);
    const expectedPayload: ITextResourcesObjectFormat = {
      [textResource.id]: textResource.value,
    };
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(
      org,
      app,
      language,
      expectedPayload,
    );
  });

  it('calls importCodeListFromOrg with correct data when onImportCodeListFromOrg is triggered', async () => {
    const codeListId = 'codeListId';
    renderAppContentLibraryWithData();

    retrievePagesConfig().codeListsWithTextResources.props.onImportCodeListFromOrg(codeListId);
    await waitFor(expect(queriesMock.importCodeListFromOrgToApp).toHaveBeenCalled);

    expect(queriesMock.importCodeListFromOrgToApp).toHaveBeenCalledTimes(1);
    expect(queriesMock.importCodeListFromOrgToApp).toHaveBeenCalledWith(org, app, codeListId);
  });

  it('Renders with the app library heading', () => {
    renderAppContentLibraryWithData();
    expect(retrieveConfig().heading).toBe(textMock('app_content_library.library_heading'));
  });
});

type RenderAppContentLibraryProps = {
  queries?: Partial<ServicesContextProps>;
  queryClient?: QueryClient;
};

const renderAppContentLibrary = ({
  queries = {},
  queryClient = createQueryClientMock(),
}: RenderAppContentLibraryProps = {}): void => {
  renderWithProviders(queries, queryClient)(<AppContentLibrary />);
};

function renderAppContentLibraryWithData(
  props?: Omit<RenderAppContentLibraryProps, 'queryClient'>,
): void {
  const queryClient = createQueryClientWithData();
  renderAppContentLibrary({ ...props, queryClient });
}

function createQueryClientWithData(): QueryClient {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.OptionLists, org, app], optionListDataList);
  queryClient.setQueryData([QueryKey.OptionListsUsage, org, app], []);
  queryClient.setQueryData([QueryKey.TextResources, org, app], textResources);
  queryClient.setQueryData([QueryKey.AvailableOrgResources, org], codeListTitles);
  return queryClient;
}

function retrievePagesConfig(): PagesConfig {
  return retrieveConfig().pages;
}

function retrieveConfig(): ContentLibraryConfig {
  return mockConstructor.mock.calls[0][0];
}
