import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CodeListPageProps, CodeListWithMetadata } from './CodeListPage';
import { CodeListPage } from './CodeListPage';
import { textMock } from '@studio/testing/mocks/i18nMock';

const onChangeCodeListIdMock = jest.fn();
const onUpdateCodeListMock = jest.fn();
const onUploadCodeListMock = jest.fn();
const codeListName = 'codeList';
const codeListMock: CodeListWithMetadata = {
  title: codeListName,
  codeList: [{ value: 'value', label: 'label' }],
};

describe('CodeListPage', () => {
  afterEach(jest.clearAllMocks);

  it('renders the codeList heading', () => {
    renderCodeList();
    const codeListHeading = screen.getByRole('heading', {
      name: textMock('app_content_library.code_lists.page_name'),
    });
    expect(codeListHeading).toBeInTheDocument();
  });

  it('renders a code list counter message', () => {
    renderCodeList();
    const codeListCounterMessage = screen.getByText(
      textMock('app_content_library.code_lists.code_lists_count_info_single'),
    );
    expect(codeListCounterMessage).toBeInTheDocument();
  });

  it('renders code list actions', () => {
    renderCodeList();
    const codeListSearchField = screen.getByRole('searchbox');
    const codeListCreatButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.create_new_code_list'),
    });
    const codeListUploadButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.upload_code_list'),
    });
    expect(codeListSearchField).toBeInTheDocument();
    expect(codeListCreatButton).toBeInTheDocument();
    expect(codeListUploadButton).toBeInTheDocument();
  });

  it('renders the code list accordion', () => {
    renderCodeList();
    const codeListAccordion = screen.getByTitle(
      textMock('app_content_library.code_lists.code_list_accordion_title', {
        codeListTitle: codeListName,
      }),
    );
    expect(codeListAccordion).toBeInTheDocument();
  });

  it('renders error message if error fetching option lists occurred', () => {
    renderCodeList({ fetchDataError: true });
    const errorMessage = screen.getByText(textMock('app_content_library.code_lists.fetch_error'));
    expect(errorMessage).toBeInTheDocument();
  });
});

const defaultCodeListPageProps: CodeListPageProps = {
  codeLists: [codeListMock],
  fetchDataError: false,
};

const renderCodeList = ({
  codeLists,
  fetchDataError,
}: Partial<CodeListPageProps> = defaultCodeListPageProps) => {
  render(
    <CodeListPage
      codeLists={codeLists}
      onChangeCodeListId={onChangeCodeListIdMock}
      onUpdateCodeList={onUpdateCodeListMock}
      onUploadCodeList={onUploadCodeListMock}
      fetchDataError={fetchDataError}
    />,
  );
};
