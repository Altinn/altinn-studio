import React from 'react';
import { OrgContentLibrary } from './OrgContentLibrary';
import type { RenderResult } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ProviderData } from '../../testing/mocks';
import { renderWithProviders } from '../../testing/mocks';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { org } from '@studio/testing/testids';
import type { CodeListData } from '@studio/content-library';
import type { CodeList } from '@studio/components';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { SelectedContextType } from '../../enums/SelectedContextType';
import { Route, Routes } from 'react-router-dom';

const updateCodeListButtonTextMock: string = 'Update Code List';
const uploadCodeListButtonTextMock: string = 'Upload Code List';
const deleteCodeListButtonTextMock: string = 'Delete Code List';
const codeListNameMock: string = 'codeListNameMock';
const codeListMock: CodeList = [{ value: '', label: '' }];
const codeListsDataMock: CodeListData[] = [{ title: codeListNameMock, data: codeListMock }];
const mockOrgPath: string = '/testOrg';

jest.mock(
  '../../../libs/studio-content-library/src/ContentLibrary/LibraryBody/pages/CodeListPage',
  () => ({
    CodeListPage: ({ onDeleteCodeList, onUpdateCodeList, onUploadCodeList }: any) => (
      <div>
        <button
          onClick={() => onUpdateCodeList({ title: codeListNameMock, codeList: codeListMock })}
        >
          {updateCodeListButtonTextMock}
        </button>
        <button
          onClick={() =>
            onUploadCodeList(
              new File(['test'], `${codeListNameMock}.json`, { type: 'application/json' }),
            )
          }
        >
          {uploadCodeListButtonTextMock}
        </button>
        <button onClick={() => onDeleteCodeList(codeListsDataMock[0].title)}>
          {deleteCodeListButtonTextMock}
        </button>
      </div>
    ),
  }),
);

jest.mock('react-router-dom', () => jest.requireActual('react-router-dom')); // Todo: Remove this when we have removed the global mock: https://github.com/Altinn/altinn-studio/issues/14597

describe('OrgContentLibrary', () => {
  afterEach(jest.clearAllMocks);

  it('renders a spinner when waiting for code lists', () => {
    renderOrgContentLibrary({ initialEntries: [mockOrgPath] });
    const spinner = screen.getByText(textMock('general.loading'));
    expect(spinner).toBeInTheDocument();
  });

  it('Renders an error message when the code lists query fails', async () => {
    const getCodeListsForOrg = () => Promise.reject(new Error('Test error'));
    renderOrgContentLibrary({
      queries: { getCodeListsForOrg },
      queryClient: createQueryClientMock(),
      initialEntries: [mockOrgPath],
    });
    await waitFor(expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument);
    const errorMessage = screen.getByText(textMock('dashboard.org_library.fetch_error'));
    expect(errorMessage).toBeInTheDocument();
  });

  it.each([SelectedContextType.None, SelectedContextType.All, SelectedContextType.Self])(
    'renders alert and omits library content when context is %s',
    (selectedContext) => {
      renderOrgContentLibrary({ initialEntries: ['/' + selectedContext] });

      const noOrgSelectedParagraph = screen.getByText(
        textMock('dashboard.org_library.alert_no_org_selected'),
      );
      expect(noOrgSelectedParagraph).toBeInTheDocument();

      const libraryTitle = screen.queryByRole('heading', {
        name: textMock('app_content_library.library_heading'),
      });
      expect(libraryTitle).not.toBeInTheDocument();
    },
  );

  it('renders the library title', async () => {
    renderOrgContentLibrary({ initialEntries: ['/some-org'] });
    await waitFor(expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument);
    const libraryTitle = screen.getByRole('heading', {
      name: textMock('app_content_library.library_heading'),
    });
    expect(libraryTitle).toBeInTheDocument();
  });

  it('renders the library landing page by default', () => {
    renderOrgContentLibrary({ initialEntries: ['/some-org'] });
    const landingPageTitle = screen.getByRole('heading', {
      name: textMock('app_content_library.landing_page.title'),
    });
    expect(landingPageTitle).toBeInTheDocument();
    const landingPageDescription = screen.getByText(
      textMock('app_content_library.landing_page.description'),
    );
    expect(landingPageDescription).toBeInTheDocument();
  });

  it('renders the code list menu element', () => {
    renderOrgContentLibrary({ initialEntries: ['/some-org'] });
    const codeListMenuElement = screen.getByRole('tab', {
      name: textMock('app_content_library.code_lists.page_name'),
    });
    expect(codeListMenuElement).toBeInTheDocument();
  });

  it('calls onUpdateCodeList when onUpdateCodeList is triggered', async () => {
    const user = userEvent.setup();
    renderOrgContentLibraryWithCodeLists({ initialEntries: [mockOrgPath] });
    await goToLibraryPage(user, 'code_lists');
    const updateCodeListButton = screen.getByRole('button', { name: updateCodeListButtonTextMock });
    await user.click(updateCodeListButton);
    expect(queriesMock.updateCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateCodeListForOrg).toHaveBeenCalledWith(
      org,
      codeListNameMock,
      codeListMock,
    );
  });

  it('calls onUploadCodeList when onUploadCodeList is triggered', async () => {
    const user = userEvent.setup();
    renderOrgContentLibraryWithCodeLists({ initialEntries: [mockOrgPath] });
    await goToLibraryPage(user, 'code_lists');
    const uploadCodeListButton = screen.getByRole('button', { name: uploadCodeListButtonTextMock });
    await user.click(uploadCodeListButton);
    expect(queriesMock.uploadCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.uploadCodeListForOrg).toHaveBeenCalledWith(org, expect.any(FormData));
  });

  it('renders success toast when onUploadCodeList is called successfully', async () => {
    const user = userEvent.setup();
    renderOrgContentLibraryWithCodeLists({ initialEntries: [mockOrgPath] });
    await goToLibraryPage(user, 'code_lists');
    const uploadCodeListButton = screen.getByRole('button', { name: uploadCodeListButtonTextMock });
    await user.click(uploadCodeListButton);
    const successToastMessage = screen.getByText(
      textMock('dashboard.org_library.code_list_upload_success'),
    );
    expect(successToastMessage).toBeInTheDocument();
  });

  it('renders error toast when onUploadCodeList is rejected with unknown error code', async () => {
    const user = userEvent.setup();
    const uploadCodeListForOrg = jest
      .fn()
      .mockImplementation(() => Promise.reject({ response: {} }));
    renderOrgContentLibraryWithCodeLists({
      initialEntries: [mockOrgPath],
      queries: { uploadCodeListForOrg },
    });
    await goToLibraryPage(user, 'code_lists');
    const uploadCodeListButton = screen.getByRole('button', { name: uploadCodeListButtonTextMock });
    await user.click(uploadCodeListButton);
    const errorToastMessage = screen.getByText(
      textMock('dashboard.org_library.code_list_upload_generic_error'),
    );
    expect(errorToastMessage).toBeInTheDocument();
  });

  it('calls onUploadCodeList and hides default error when handleUpload is triggered', async () => {
    const user = userEvent.setup();
    renderOrgContentLibraryWithCodeLists({ initialEntries: [mockOrgPath] });
    await goToLibraryPage(user, 'code_lists');
    const uploadCodeListButton = screen.getByRole('button', { name: uploadCodeListButtonTextMock });
    await user.click(uploadCodeListButton);
    expect(queriesMock.uploadCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.uploadCodeListForOrg).toHaveBeenCalledWith(org, expect.any(FormData));
    const hideDefaultError = screen.queryByText(textMock('dashboard.org_library.default_error'));
    expect(hideDefaultError).not.toBeInTheDocument();
  });

  it('calls deleteCodeListForOrg when onDeleteCodeList is triggered', async () => {
    const user = userEvent.setup();
    renderOrgContentLibraryWithCodeLists({ initialEntries: ['/testOrg'] });
    await goToLibraryPage(user, 'code_lists');
    const deleteCodeListButton = screen.getByRole('button', { name: deleteCodeListButtonTextMock });
    await user.click(deleteCodeListButton);
    expect(queriesMock.deleteCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteCodeListForOrg).toHaveBeenCalledWith(org, codeListsDataMock[0].title);
  });
});

const getLibraryPageTile = (libraryPage: string) =>
  screen.getByText(textMock(`app_content_library.${libraryPage}.page_name`));

const goToLibraryPage = async (user: UserEvent, libraryPage: string) => {
  const libraryPageNavTile = getLibraryPageTile(libraryPage);
  await user.click(libraryPageNavTile);
};

function renderOrgContentLibrary(providerData: ProviderData): RenderResult {
  return renderWithProviders(
    <Routes>
      <Route path=':selectedContext' element={<OrgContentLibrary />} />
    </Routes>,
    providerData,
  );
}

function renderOrgContentLibraryWithCodeLists(providerData: ProviderData): void {
  const queryClient = createQueryClientWithOptionsDataList(codeListsDataMock);
  renderOrgContentLibrary({ ...providerData, queryClient });
}

function createQueryClientWithOptionsDataList(
  codeListDataList: CodeListData[] | undefined,
): QueryClient {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.OrgCodeLists, org], codeListDataList);
  return queryClient;
}
