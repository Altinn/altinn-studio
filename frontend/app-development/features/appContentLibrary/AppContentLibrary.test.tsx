import React from 'react';
import { screen } from '@testing-library/react';
import { AppContentLibrary } from './AppContentLibrary';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../test/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import type { CodeList } from '@studio/components';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { OptionListData } from 'app-shared/types/OptionList';

const uploadCodeListButtonTextMock = 'Upload Code List';
const updateCodeListButtonTextMock = 'Update Code List';
const updateCodeListIdButtonTextMock = 'Update Code List Id';
const codeListNameMock = 'codeListNameMock';
const newCodeListNameMock = 'newCodeListNameMock';
const codeListMock: CodeList = [{ value: '', label: '' }];
const optionListsDataMock: OptionListData[] = [{ title: codeListNameMock, data: codeListMock }];
jest.mock(
  '../../../libs/studio-content-library/src/ContentLibrary/LibraryBody/pages/CodeListPage',
  () => ({
    CodeListPage: ({ onUpdateCodeList, onUploadCodeList, onUpdateCodeListId }: any) => (
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
        <button
          onClick={() => onUpdateCodeList({ title: codeListNameMock, codeList: codeListMock })}
        >
          {updateCodeListButtonTextMock}
        </button>
        <button onClick={() => onUpdateCodeListId(codeListNameMock, newCodeListNameMock)}>
          {updateCodeListIdButtonTextMock}
        </button>
      </div>
    ),
  }),
);

describe('AppContentLibrary', () => {
  afterEach(jest.clearAllMocks);

  it('renders the AppContentLibrary with codeLists and images resources available in the content menu', () => {
    renderAppContentLibrary();
    const libraryTitle = screen.getByRole('heading', {
      name: textMock('app_content_library.landing_page.title'),
    });
    const codeListMenuElement = getLibraryPageTile('code_lists');
    const imagesMenuElement = getLibraryPageTile('images');
    expect(libraryTitle).toBeInTheDocument();
    expect(codeListMenuElement).toBeInTheDocument();
    expect(imagesMenuElement).toBeInTheDocument();
  });

  it('renders a spinner when waiting for option lists', () => {
    renderAppContentLibrary({ shouldPutDataOnCache: false });
    const spinner = screen.getByText(textMock('general.loading'));
    expect(spinner).toBeInTheDocument();
  });

  it('calls onUploadOptionList when onUploadCodeList is triggered', async () => {
    const user = userEvent.setup();
    renderAppContentLibrary();
    await goToLibraryPage(user, 'code_lists');
    const uploadCodeListButton = screen.getByRole('button', { name: uploadCodeListButtonTextMock });
    await user.click(uploadCodeListButton);
    expect(queriesMock.uploadOptionList).toHaveBeenCalledTimes(1);
    expect(queriesMock.uploadOptionList).toHaveBeenCalledWith(org, app, expect.any(FormData));
  });

  it('renders success toast when onUploadOptionList is called successfully', async () => {
    const user = userEvent.setup();
    renderAppContentLibrary();
    await goToLibraryPage(user, 'code_lists');
    const uploadCodeListButton = screen.getByRole('button', { name: uploadCodeListButtonTextMock });
    await user.click(uploadCodeListButton);
    const successToastMessage = screen.getByText(
      textMock('ux_editor.modal_properties_code_list_upload_success'),
    );
    expect(successToastMessage).toBeInTheDocument();
  });

  it('renders error toast when onUploadOptionList is rejected with unknown error code', async () => {
    const user = userEvent.setup();
    const uploadOptionList = jest.fn().mockImplementation(() => Promise.reject({ response: {} }));
    renderAppContentLibrary({ queries: { uploadOptionList } });
    await goToLibraryPage(user, 'code_lists');
    const uploadCodeListButton = screen.getByRole('button', { name: uploadCodeListButtonTextMock });
    await user.click(uploadCodeListButton);
    const errorToastMessage = screen.getByText(
      textMock('ux_editor.modal_properties_code_list_upload_generic_error'),
    );
    expect(errorToastMessage).toBeInTheDocument();
  });

  it('calls onUpdateOptionList when onUpdateCodeList is triggered', async () => {
    const user = userEvent.setup();
    renderAppContentLibrary();
    await goToLibraryPage(user, 'code_lists');
    const updateCodeListButton = screen.getByRole('button', { name: updateCodeListButtonTextMock });
    await user.click(updateCodeListButton);
    expect(queriesMock.updateOptionList).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateOptionList).toHaveBeenCalledWith(
      org,
      app,
      codeListNameMock,
      codeListMock,
    );
  });

  it('calls onUpdateOptionListId when onUpdateCodeListId is triggered', async () => {
    const user = userEvent.setup();
    renderAppContentLibrary();
    await goToLibraryPage(user, 'code_lists');
    const updateCodeListIdButton = screen.getByRole('button', {
      name: updateCodeListIdButtonTextMock,
    });
    await user.click(updateCodeListIdButton);
    expect(queriesMock.updateOptionListId).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateOptionListId).toHaveBeenCalledWith(
      org,
      app,
      codeListNameMock,
      newCodeListNameMock,
    );
  });
});

const getLibraryPageTile = (libraryPage: string) =>
  screen.getByText(textMock(`app_content_library.${libraryPage}.page_name`));

const goToLibraryPage = async (user: UserEvent, libraryPage: string) => {
  const libraryPageNavTile = getLibraryPageTile(libraryPage);
  await user.click(libraryPageNavTile);
};

type renderAppContentLibraryProps = {
  queries?: Partial<ServicesContextProps>;
  shouldPutDataOnCache?: boolean;
  optionListsData?: OptionListData[];
};

const renderAppContentLibrary = ({
  queries = {},
  shouldPutDataOnCache = true,
  optionListsData = optionListsDataMock,
}: renderAppContentLibraryProps = {}) => {
  const queryClientMock = createQueryClientMock();
  if (shouldPutDataOnCache) {
    queryClientMock.setQueryData([QueryKey.OptionLists, org, app], optionListsData);
    queryClientMock.setQueryData([QueryKey.OptionListsUsage, org, app], []);
  }
  renderWithProviders(queries, queryClientMock)(<AppContentLibrary />);
};
