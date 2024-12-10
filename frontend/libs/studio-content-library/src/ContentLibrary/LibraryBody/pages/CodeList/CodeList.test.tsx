import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import type { CodeListProps, CodeListWithMetadata } from './CodeList';
import { CodeList } from './CodeList';
import { textMock } from '@studio/testing/mocks/i18nMock';

const onUpdateCodeListIdMock = jest.fn();
const onUpdateCodeListMock = jest.fn();
const onUploadCodeListMock = jest.fn();
const codeListName = 'codeList';
const codeListMock = [{ value: 'value', label: 'label' }];
const codeListWithMetadataMock: CodeListWithMetadata = {
  title: codeListName,
  codeList: codeListMock,
};
const uploadedCodeListName = 'uploadedCodeListName';
const defaultCodeListProps: Partial<CodeListProps> = {
  codeLists: [codeListWithMetadataMock],
  fetchDataError: false,
};

describe('CodeList', () => {
  afterEach(() => {
    defaultCodeListProps.codeLists = [codeListWithMetadataMock];
    defaultCodeListProps.fetchDataError = false;
    jest.clearAllMocks();
  });

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

  it('render the code list accordion as default open when uploading a code list', async () => {
    const user = userEvent.setup();
    const { rerender } = renderCodeList();
    const codeListAccordionClosed = screen.getByRole('button', {
      name: codeListName,
      expanded: false,
    });
    expect(codeListAccordionClosed).toHaveAttribute('aria-expanded', 'false');
    await uploadCodeList(user, uploadedCodeListName);
    defaultCodeListProps.codeLists.push({ title: uploadedCodeListName, codeList: codeListMock });
    rerender(
      <CodeList
        codeLists={defaultCodeListProps.codeLists}
        onUpdateCodeListId={onUpdateCodeListIdMock}
        onUpdateCodeList={onUpdateCodeListMock}
        onUploadCodeList={onUploadCodeListMock}
        fetchDataError={defaultCodeListProps.fetchDataError}
      />,
    );
    const codeListAccordionOpen = screen.getByRole('button', {
      name: uploadedCodeListName,
      expanded: true,
    });
    expect(codeListAccordionOpen).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders error message if error fetching option lists occurred', () => {
    renderCodeList({ fetchDataError: true });
    const errorMessage = screen.getByText(textMock('app_content_library.code_lists.fetch_error'));
    expect(errorMessage).toBeInTheDocument();
  });

  it('calls onUpdateCodeListId when Id is changed', async () => {
    const user = userEvent.setup();
    renderCodeList();
    await changeCodeListId(user, codeListName);
    expect(onUpdateCodeListIdMock).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeListIdMock).toHaveBeenCalledWith(codeListName, codeListName + '2');
  });

  it('calls onUpdateCodeList when code list is changed', async () => {
    const user = userEvent.setup();
    const newValueText = 'newValueText';
    renderCodeList();
    await changeCodeListContent(user, newValueText);
    expect(onUpdateCodeListMock).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeListMock).toHaveBeenLastCalledWith({
      ...codeListWithMetadataMock,
      codeList: [{ ...codeListWithMetadataMock.codeList[0], value: newValueText }],
    });
  });

  it('calls onUploadCodeList when uploading a code list', async () => {
    const user = userEvent.setup();
    renderCodeList();
    await uploadCodeList(user);
    expect(onUploadCodeListMock).toHaveBeenCalledTimes(1);
    expect(onUploadCodeListMock).toHaveBeenCalledWith(expect.any(Object));
  });
});

const changeCodeListId = async (user: UserEvent, codeListNameToChange: string) => {
  const codeListIdToggleTextfield = screen.getByTitle(
    textMock('app_content_library.code_lists.code_list_view_id_title', {
      codeListName: codeListNameToChange,
    }),
  );
  await user.click(codeListIdToggleTextfield);
  const codeListIdInput = screen.getByTitle(
    textMock('app_content_library.code_lists.code_list_edit_id_title', {
      codeListName: codeListNameToChange,
    }),
  );
  await user.type(codeListIdInput, '2');
  await user.tab();
};

const changeCodeListContent = async (user: UserEvent, newValueText: string) => {
  const codeListFirstItemValue = screen.getByLabelText(
    textMock('code_list_editor.value_item', { number: 1 }),
  );
  await user.type(codeListFirstItemValue, newValueText);
  await user.tab();
};

const uploadCodeList = async (user: UserEvent, fileName: string = uploadedCodeListName) => {
  const fileUploaderButton = screen.getByLabelText(
    textMock('app_content_library.code_lists.upload_code_list'),
  );
  const file = new File(['test'], `${fileName}.json`, { type: 'application/json' });
  await user.upload(fileUploaderButton, file);
};

const renderCodeList = ({
  codeLists,
  fetchDataError,
}: Partial<CodeListProps> = defaultCodeListProps) => {
  return render(
    <CodeList
      codeLists={codeLists}
      onUpdateCodeListId={onUpdateCodeListIdMock}
      onUpdateCodeList={onUpdateCodeListMock}
      onUploadCodeList={onUploadCodeListMock}
      fetchDataError={fetchDataError}
    />,
  );
};
