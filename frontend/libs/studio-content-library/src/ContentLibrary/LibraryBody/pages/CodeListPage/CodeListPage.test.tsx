import React from 'react';
import { render, screen, within } from '@testing-library/react';
import type { CodeListData, CodeListPageProps } from './CodeListPage';
import { CodeListPage } from './CodeListPage';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { CodeList as StudioComponentCodeList } from '@studio/components';
import { codeListsDataMock } from '../../../../../mocks/mockPagesConfig';
import { label1ResourceNb, textResources } from '../../../../test-data/textResources';
import { codeList1Data, codeListDataList } from '../../../../test-data/codeListDataList';
import type { TextResourceWithLanguage } from '../../../../types/TextResourceWithLanguage';

const onDeleteCodeListMock = jest.fn();
const onUpdateCodeListIdMock = jest.fn();
const onUpdateCodeListMock = jest.fn();
const onUploadCodeListMock = jest.fn();
const codeListName = codeListsDataMock[0].title;
const codeListMock: StudioComponentCodeList = [{ value: 'value', label: 'label' }];
const uploadedCodeListName = 'uploadedCodeListName';

describe('CodeListPage', () => {
  afterEach(() => {
    defaultCodeListPageProps.codeListsData = [...codeListsDataMock];
    jest.clearAllMocks();
  });

  it('renders the codeList heading', () => {
    renderCodeListPage();
    const codeListHeading = screen.getByRole('heading', {
      name: textMock('app_content_library.code_lists.page_name'),
    });
    expect(codeListHeading).toBeInTheDocument();
  });

  it('renders a code list counter message', () => {
    renderCodeListPage();
    const codeListCounterMessage = screen.getByText(
      textMock('app_content_library.code_lists.code_lists_count_info_single'),
    );
    expect(codeListCounterMessage).toBeInTheDocument();
  });

  it('renders code list actions', () => {
    renderCodeListPage();
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
    renderCodeListPage();
    const codeListAccordion = screen.getByRole('button', { name: codeListName });
    expect(codeListAccordion).toBeInTheDocument();
  });

  it('renders the code list accordion', () => {
    renderCodeListPage();
    const codeListAccordion = getCodeListAccordionHeading(codeListName);
    expect(codeListAccordion).toBeInTheDocument();
  });

  it('renders all code lists when search param matches all lists', async () => {
    const user = userEvent.setup();
    const codeList2 = 'codeList2';
    const codeListsSearchParam = 'code';
    renderCodeListPage({
      codeListsData: [...codeListsDataMock, { title: codeList2, data: codeListMock }],
    });
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, codeListsSearchParam);
    [codeListName, codeList2].forEach((codeListTitle) => {
      expect(getCodeListAccordionHeading(codeListTitle)).toBeInTheDocument();
    });
  });

  it('renders the matching code lists when search param limits result', async () => {
    const user = userEvent.setup();
    const codeList2 = 'codeList2';
    const codeListsSearchParam = '2';
    renderCodeListPage({
      codeListsData: [...codeListsDataMock, { title: codeList2, data: codeListMock }],
    });
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, codeListsSearchParam);
    expect(getCodeListAccordionHeading(codeList2)).toBeInTheDocument();
    expect(
      screen.queryByTitle(
        textMock('app_content_library.code_lists.code_list_accordion_title', {
          codeListTitle: codeListName,
        }),
      ),
    ).not.toBeInTheDocument();
  });

  it('render the code list accordion as default open when uploading a code list', async () => {
    const user = userEvent.setup();
    const { rerender } = renderCodeListPage();
    const codeListAccordionClosed = screen.getByRole('button', {
      name: codeListName,
      expanded: false,
    });
    expect(codeListAccordionClosed).toHaveAttribute('aria-expanded', 'false');
    await uploadCodeList(user, uploadedCodeListName);
    defaultCodeListPageProps.codeListsData.push({
      title: uploadedCodeListName,
      data: codeListMock,
    });
    const newCodeListsData: CodeListData[] = [...defaultCodeListPageProps.codeListsData];
    rerender(<CodeListPage {...defaultCodeListPageProps} codeListsData={newCodeListsData} />);
    const codeListAccordionOpen = screen.getByRole('button', {
      name: uploadedCodeListName,
      expanded: true,
    });
    expect(codeListAccordionClosed).toHaveAttribute('aria-expanded', 'false');
    expect(codeListAccordionOpen).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onUpdateCodeListId when Id is changed', async () => {
    const user = userEvent.setup();
    renderCodeListPage();
    await changeCodeListId(user, codeListName);
    expect(onUpdateCodeListIdMock).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeListIdMock).toHaveBeenCalledWith(codeListName, codeListName + '2');
  });

  it('calls onUpdateCodeList when code list is changed', async () => {
    const user = userEvent.setup();
    const newValueText = 'newValueText';
    renderCodeListPage();
    await changeCodeListContent(user, newValueText);
    expect(onUpdateCodeListMock).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeListMock).toHaveBeenLastCalledWith({
      codeList: [{ ...codeListsDataMock[0].data[0], value: newValueText }],
      title: codeListName,
    });
  });

  it('calls onUploadCodeList when uploading a code list', async () => {
    const user = userEvent.setup();
    renderCodeListPage();
    await uploadCodeList(user);
    expect(onUploadCodeListMock).toHaveBeenCalledTimes(1);
    expect(onUploadCodeListMock).toHaveBeenCalledWith(expect.any(Object));
  });

  it('Renders with text resources in the input fields when given', async () => {
    const user = userEvent.setup();
    renderCodeListPage({ textResources, codeListsData: codeListDataList });
    const labelField = await openAndGetFirstLabelField(user, codeList1Data.title);
    expect(labelField).toHaveValue(label1ResourceNb.value);
  });

  it('Calls onUpdateTextResource with the new text resource and the default language when a text resource is changed', async () => {
    const user = userEvent.setup();
    const onUpdateTextResource = jest.fn();
    const newLabel = 'Ny ledetekst';

    renderCodeListPage({ textResources, codeListsData: codeListDataList, onUpdateTextResource });
    const labelField = await openAndGetFirstLabelField(user, codeList1Data.title);
    await user.type(labelField, newLabel);

    const expectedLanguage = 'nb';
    const expectedObject: TextResourceWithLanguage = {
      language: expectedLanguage,
      textResource: { ...label1ResourceNb, value: newLabel },
    };
    expect(onUpdateTextResource).toHaveBeenCalledTimes(newLabel.length);
    expect(onUpdateTextResource).toHaveBeenLastCalledWith(expectedObject);
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
    textMock('app_content_library.code_lists.code_list_view_id_title', {
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

const openAndGetFirstLabelField = async (
  user: UserEvent,
  codeListTitle: string,
): Promise<HTMLElement> => {
  await user.click(getCodeListAccordionHeading(codeListTitle));
  const accordion = getCodeListAccordion(codeListTitle);
  const labelFieldLabel = textMock('code_list_editor.text_resource.label.value', { number: 1 });
  return within(accordion).getByRole('textbox', { name: labelFieldLabel });
};

const getCodeListAccordion = (codeListTitle: string): HTMLElement =>
  // The following code accesses a node directly with parentElement. This is not recommended, hence the Eslint rule, but there is no other way to access the accordion element.
  // Todo: When we upgrade The Design System, we should use the new `Details` component with `getByRole('group')` instead. https://github.com/Altinn/altinn-studio/issues/14577
  getCodeListAccordionHeading(codeListTitle).parentElement; // eslint-disable-line testing-library/no-node-access

const getCodeListAccordionHeading = (codeListTitle: string): HTMLElement =>
  screen.getByRole('heading', { name: codeListTitle });

const defaultCodeListPageProps: CodeListPageProps = {
  codeListsData: codeListsDataMock,
  onDeleteCodeList: onDeleteCodeListMock,
  onUpdateCodeListId: onUpdateCodeListIdMock,
  onUpdateCodeList: onUpdateCodeListMock,
  onUploadCodeList: onUploadCodeListMock,
  codeListsUsages: [],
};

const renderCodeListPage = (props: Partial<CodeListPageProps> = {}) => {
  return render(<CodeListPage {...defaultCodeListPageProps} {...props} />);
};
