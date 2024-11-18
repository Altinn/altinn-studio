import React from 'react';
import { screen } from '@testing-library/react';
import { AppContentLibrary } from './AppContentLibrary';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../test/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import userEvent from '@testing-library/user-event';
import type { Option } from 'app-shared/types/Option';

const optionListsMock: Record<string, Option[]> = {
  list1: [{ label: 'label', value: 'value' }],
};

describe('AppContentLibrary', () => {
  afterEach(jest.clearAllMocks);

  it('renders the AppContentLibrary with codeLists and images resources', () => {
    renderAppContentLibrary(optionListsMock);
    const libraryTitle = screen.getByRole('heading', {
      name: textMock('app_content_library.landing_page.title'),
    });
    const codeListMenuElement = screen.getByText(
      textMock('app_content_library.code_lists.page_name'),
    );
    const imagesMenuElement = screen.getByText(textMock('app_content_library.images.page_name'));
    expect(libraryTitle).toBeInTheDocument();
    expect(codeListMenuElement).toBeInTheDocument();
    expect(imagesMenuElement).toBeInTheDocument();
  });

  it('renders a spinner when waiting for option lists', () => {
    renderAppContentLibrary();
    const spinner = screen.getByText(textMock('general.loading'));
    expect(spinner).toBeInTheDocument();
  });

  it('calls onUploadOptionList when onUploadCodeList is triggered', async () => {
    const user = userEvent.setup();
    renderAppContentLibrary(optionListsMock);
    const codeListNavTitle = screen.getByText(textMock('app_content_library.code_lists.page_name'));
    await user.click(codeListNavTitle);
    const uploadCodeListButton = screen.getByLabelText(
      textMock('app_content_library.code_lists.upload_code_list'),
    );
    const file = new File(['test'], 'fileNameMock.json', { type: 'application/json' });
    await user.upload(uploadCodeListButton, file);
    expect(queriesMock.uploadOptionList).toHaveBeenCalledTimes(1);
  });
});

const renderAppContentLibrary = (optionLists: Record<string, Option[]> = {}) => {
  const queryClientMock = createQueryClientMock();
  if (Object.keys(optionLists).length) {
    queryClientMock.setQueryData([QueryKey.OptionLists, org, app], optionLists);
  }
  renderWithProviders({}, queryClientMock)(<AppContentLibrary />);
};
