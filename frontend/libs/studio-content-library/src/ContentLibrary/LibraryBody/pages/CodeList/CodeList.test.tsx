import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CodeListProps, CodeListWithMetadata } from './CodeList';
import { CodeList } from './CodeList';
import { textMock } from '@studio/testing/mocks/i18nMock';

const onUpdateCodeListMock = jest.fn();
const onUploadCodeListMock = jest.fn();
const codeListName = 'codeList';
const codeListMock: CodeListWithMetadata = {
  title: codeListName,
  codeList: [{ value: 'value', label: 'label' }],
};

describe('CodeList', () => {
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

  it('renders the code list as a clickable element', () => {
    renderCodeList();
    const codeListAccordion = screen.getByRole('button', { name: codeListName });
    expect(codeListAccordion).toBeInTheDocument();
  });

  it('renders error message if error fetching option lists occurred', () => {
    renderCodeList({ fetchDataError: true });
    const errorMessage = screen.getByText(textMock('app_content_library.code_lists.fetch_error'));
    expect(errorMessage).toBeInTheDocument();
  });
});

const defaultCodeListProps: CodeListProps = {
  codeLists: [codeListMock],
  onUpdateCodeList: onUpdateCodeListMock,
  onUploadCodeList: onUploadCodeListMock,
  fetchDataError: false,
};

const renderCodeList = ({
  codeLists,
  onUpdateCodeList,
  onUploadCodeList,
  fetchDataError,
}: Partial<CodeListProps> = defaultCodeListProps) => {
  render(
    <CodeList
      codeLists={codeLists}
      onUpdateCodeList={onUpdateCodeList}
      onUploadCodeList={onUploadCodeList}
      fetchDataError={fetchDataError}
    />,
  );
};
