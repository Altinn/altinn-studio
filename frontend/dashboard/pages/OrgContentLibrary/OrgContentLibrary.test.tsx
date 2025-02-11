import React from 'react';
import { OrgContentLibrary } from './OrgContentLibrary';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../testing/mocks';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { org } from '@studio/testing/testids';
import type { CodeListData } from '@studio/content-library';
import type { CodeList } from '@studio/components';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const uploadCodeListButtonTextMock = 'Upload Code List';
const codeListNameMock = 'codeListNameMock';
const codeListMock: CodeList = [{ value: '', label: '' }];
const codeListsDataMock: CodeListData[] = [{ title: codeListNameMock, data: codeListMock }];

jest.mock(
  '../../../libs/studio-content-library/src/ContentLibrary/LibraryBody/pages/CodeListPage',
  () => ({
    CodeListPage: ({ onUploadCodeList }: any) => (
      <div>
        <button
          onClick={() =>
            onUploadCodeList(
              new File(['test'], `${codeListNameMock}.json`, { type: 'application/json' }),
            )
          }
        >
          {uploadCodeListButtonTextMock}
        </button>
      </div>
    ),
  }),
);

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    selectedContext: 'testOrg',
  }),
}));

describe('OrgContentLibrary', () => {
  afterEach(jest.clearAllMocks);

  it('renders the library title', () => {
    renderWithProviders(<OrgContentLibrary />);
    const libraryTitle = screen.getByRole('heading', {
      name: textMock('app_content_library.library_heading'),
    });
    expect(libraryTitle).toBeInTheDocument();
  });

  it('renders the library landing page by default', () => {
    renderWithProviders(<OrgContentLibrary />);
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
    renderWithProviders(<OrgContentLibrary />);
    const codeListMenuElement = screen.getByRole('tab', {
      name: textMock('app_content_library.code_lists.page_name'),
    });
    expect(codeListMenuElement).toBeInTheDocument();
  });

  it('calls onUploadCodeList when onUploadCodeList is triggered', async () => {
    const user = userEvent.setup();
    renderOrgContentLibraryWithCodeLists();
    await goToLibraryPage(user, 'code_lists');
    const uploadCodeListButton = screen.getByRole('button', { name: uploadCodeListButtonTextMock });
    await user.click(uploadCodeListButton);
    expect(queriesMock.uploadCodeListForOrg).toHaveBeenCalledTimes(1);
    expect(queriesMock.uploadCodeListForOrg).toHaveBeenCalledWith(org, expect.any(FormData));
  });

  it('renders success toast when onUploadCodeList is called successfully', async () => {
    const user = userEvent.setup();
    renderOrgContentLibraryWithCodeLists();
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
    renderOrgContentLibraryWithCodeLists({ queries: { uploadCodeListForOrg } });
    await goToLibraryPage(user, 'code_lists');
    const uploadCodeListButton = screen.getByRole('button', { name: uploadCodeListButtonTextMock });
    await user.click(uploadCodeListButton);
    const errorToastMessage = screen.getByText(
      textMock('dashboard.org_library.code_list_upload_generic_error'),
    );
    expect(errorToastMessage).toBeInTheDocument();
  });
});

const getLibraryPageTile = (libraryPage: string) =>
  screen.getByText(textMock(`app_content_library.${libraryPage}.page_name`));

const goToLibraryPage = async (user: UserEvent, libraryPage: string) => {
  const libraryPageNavTile = getLibraryPageTile(libraryPage);
  await user.click(libraryPageNavTile);
};

type RenderOrgContentLibraryProps = {
  queries?: Partial<ServicesContextProps>;
  queryClient?: QueryClient;
};

const renderAppContentLibrary = ({
  queries = {},
  queryClient = createQueryClientMock(),
}: RenderOrgContentLibraryProps = {}): void => {
  renderWithProviders(<OrgContentLibrary />, {
    queries,
    queryClient,
  });
};

function renderOrgContentLibraryWithCodeLists(
  props?: Omit<RenderOrgContentLibraryProps, 'queryClient'>,
): void {
  const queryClient = createQueryClientWithOptionsDataList(codeListsDataMock);
  renderAppContentLibrary({ ...props, queryClient });
}

function createQueryClientWithOptionsDataList(
  codeListDataList: CodeListData[] | undefined,
): QueryClient {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.OrgCodeLists, org], codeListDataList);
  return queryClient;
}
