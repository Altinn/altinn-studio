import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { AppContentLibrary } from './AppContentLibrary';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../test/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { CodeList } from '@studio/components';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { OptionListData } from 'app-shared/types/OptionList';
import type { QueryClient } from '@tanstack/react-query';
import type {
  CodeListData,
  CodeListWithMetadata,
  PagesConfig,
  ResourceContentLibraryImpl,
} from '@studio/content-library';

// Mocks:
jest.mock('@studio/content-library', () => ({
  ...jest.requireActual('@studio/content-library'),
  ResourceContentLibraryImpl: mockContentLibrary,
}));

function mockContentLibrary(
  ...args: ConstructorParameters<typeof ResourceContentLibraryImpl>
): Partial<ResourceContentLibraryImpl> {
  constructor(...args);
  return { getContentResourceLibrary };
}

const constructor = jest.fn();
const getContentResourceLibrary = jest.fn();

// Test data:
const codeListName = 'codeListNameMock';
const codeList: CodeList = [{ value: '', label: '' }];
const codeListWithMetadata: CodeListWithMetadata = {
  codeList,
  title: codeListName,
};
const optionListData: OptionListData = { title: codeListName, data: codeList };

describe('AppContentLibrary', () => {
  afterEach(jest.clearAllMocks);

  it('Renders the content library', async () => {
    renderAppContentLibraryWithOptionLists();
    expect(getContentResourceLibrary).toHaveBeenCalledTimes(1);
  });

  it('renders a spinner when waiting for option lists', () => {
    renderAppContentLibrary();
    const spinner = screen.getByText(textMock('general.loading'));
    expect(spinner).toBeInTheDocument();
  });

  it('Renders an error message when the option lists query fails', async () => {
    const getOptionLists = () => Promise.reject(new Error('Test error'));
    renderAppContentLibrary({ queries: { getOptionLists } });
    await waitFor(expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument);
    const errorMessage = screen.getByText(textMock('app_content_library.fetch_error'));
    expect(errorMessage).toBeInTheDocument();
  });

  it('Renders with the given code lists', () => {
    renderAppContentLibraryWithOptionLists();
    const codeListDataList = retrieveConfig().codeList.props.codeListsData;
    const expectedData: CodeListData[] = [{ title: codeListName, data: codeList }];
    expect(codeListDataList).toEqual(expectedData);
  });

  it('calls uploadOptionList with correct data when onUploadCodeList is triggered', async () => {
    const uploadOptionList = jest.fn();
    const file = new File([''], 'list.json');
    renderAppContentLibraryWithOptionLists({ queries: { uploadOptionList } });

    retrieveConfig().codeList.props.onUploadCodeList(file);
    await waitFor(expect(uploadOptionList).toHaveBeenCalled);

    expect(uploadOptionList).toHaveBeenCalledTimes(1);
    expect(uploadOptionList).toHaveBeenCalledWith(org, app, expect.any(FormData));
    const formData: FormData = uploadOptionList.mock.calls[0][2];
    expect(formData.get('file')).toBe(file);
  });

  it('renders success toast when onUploadOptionList is called successfully', async () => {
    renderAppContentLibraryWithOptionLists();
    const file = new File([''], 'list.json');

    retrieveConfig().codeList.props.onUploadCodeList(file);
    await waitFor(expect(queriesMock.uploadOptionList).toHaveBeenCalled);

    const successMessage = textMock('ux_editor.modal_properties_code_list_upload_success');
    expect(screen.getByText(successMessage)).toBeInTheDocument();
  });

  it('renders error toast when onUploadOptionList is rejected with unknown error code', async () => {
    const uploadOptionList = jest.fn().mockImplementation(() => Promise.reject({ response: {} }));
    const file = new File([''], 'list.json');
    renderAppContentLibraryWithOptionLists({ queries: { uploadOptionList } });

    retrieveConfig().codeList.props.onUploadCodeList(file);
    await waitFor(expect(uploadOptionList).toHaveBeenCalled);

    const errorMessage = textMock('ux_editor.modal_properties_code_list_upload_generic_error');
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('calls updateOptionList with correct data when onUpdateCodeList is triggered', async () => {
    renderAppContentLibraryWithOptionLists();

    retrieveConfig().codeList.props.onUpdateCodeList(codeListWithMetadata);
    await waitFor(expect(queriesMock.updateOptionList).toHaveBeenCalled);

    expect(queriesMock.updateOptionList).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateOptionList).toHaveBeenCalledWith(org, app, codeListName, codeList);
  });

  it('calls updateOptionListId with correct data when onUpdateCodeListId is triggered', async () => {
    const newName = 'newName';
    renderAppContentLibraryWithOptionLists();

    retrieveConfig().codeList.props.onUpdateCodeListId(codeListName, newName);
    await waitFor(expect(queriesMock.updateOptionListId).toHaveBeenCalled);

    expect(queriesMock.updateOptionListId).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateOptionListId).toHaveBeenCalledWith(org, app, codeListName, newName);
  });

  it('calls deleteOptionList with correct data when onDeleteCodeList is triggered', async () => {
    renderAppContentLibraryWithOptionLists();

    retrieveConfig().codeList.props.onDeleteCodeList(codeListName);
    await waitFor(expect(queriesMock.deleteOptionList).toHaveBeenCalled);

    expect(queriesMock.deleteOptionList).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteOptionList).toHaveBeenCalledWith(org, app, codeListName);
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

function renderAppContentLibraryWithOptionLists(
  props?: Omit<RenderAppContentLibraryProps, 'queryClient'>,
): void {
  const queryClient = createQueryClientWithOptionsDataList([optionListData]);
  renderAppContentLibrary({ ...props, queryClient });
}

function createQueryClientWithOptionsDataList(
  optionListDataList: OptionListData[] | undefined,
): QueryClient {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.OptionLists, org, app], optionListDataList);
  queryClient.setQueryData([QueryKey.OptionListsUsage, org, app], []);
  return queryClient;
}

function retrieveConfig(): PagesConfig {
  return constructor.mock.calls[0][0].pages;
}
