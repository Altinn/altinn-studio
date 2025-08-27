import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen, within } from '@testing-library/react';
import type { CodeListData, CodeListPageProps } from './CodeListPage';
import { CodeListPage } from './CodeListPage';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  codeList1Data,
  codeList2Data,
  codeListDataList,
} from '../../../../test-data/codeListDataList';
import { ArrayUtils } from 'libs/studio-pure-functions/src';
import { label1ResourceNb, textResources } from '../../../../test-data/textResources';
import type { TextResource } from '../../../../types/TextResource';
import type { TextResourceWithLanguage } from '../../../../types/TextResourceWithLanguage';

const onCreateCodeList = jest.fn();
const onDeleteCodeList = jest.fn();
const onUpdateCodeListId = jest.fn();
const onUpdateCodeList = jest.fn();
const onUploadCodeList = jest.fn();
const defaultCodeListPageProps: CodeListPageProps = {
  codeListDataList,
  onDeleteCodeList,
  onUpdateCodeListId,
  onUpdateCodeList,
  onCreateCodeList,
  onUploadCodeList,
  codeListsUsages: [],
  textResources,
};

describe('CodeListPage', () => {
  afterEach(jest.clearAllMocks);

  it('renders the codeList page heading', () => {
    renderCodeListPage();
    const codeListHeading = screen.getByRole('heading', {
      name: textMock('app_content_library.code_lists.page_name'),
    });
    expect(codeListHeading).toBeInTheDocument();
  });

  it('renders a code list counter message', () => {
    renderCodeListPage();
    const codeListCounterMessage = screen.getByText(
      textMock('app_content_library.code_lists.code_lists_count_info_plural'),
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
    const codeListHeading = getCodeListHeading(codeList1Data.title);
    expect(codeListHeading).toBeInTheDocument();
  });

  it('renders the code list details element', () => {
    renderCodeListPage();
    const codeListDetails = getCodeListDetails(codeList1Data.title);
    expect(codeListDetails).toBeInTheDocument();
  });

  it('renders all code lists when search param matches all lists', async () => {
    const user = userEvent.setup();
    const codeListsSearchParam = 'code';
    renderCodeListPage();
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, codeListsSearchParam);
    ArrayUtils.mapByKey(codeListDataList, 'title').forEach((codeListTitle) => {
      expect(getCodeListHeading(codeListTitle)).toBeInTheDocument();
    });
  });

  it('renders the matching code lists when search param limits result', async () => {
    const user = userEvent.setup();
    const codeListsSearchParam = '2';
    renderCodeListPage();
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, codeListsSearchParam);
    expect(getCodeListHeading(codeList2Data.title)).toBeInTheDocument();
    expect(queryCodeListHeading(codeList1Data.title)).not.toBeInTheDocument();
  });

  it('opens the new code list details when the user has uploaded a code list', async () => {
    const user = userEvent.setup();
    const { rerender } = renderCodeListPage();
    const newCodeListData: CodeListData = {
      title: 'newCodeList',
      data: [{ value: 'value', label: 'label' }],
    };
    const newCodeListDataList: CodeListData[] = [
      ...defaultCodeListPageProps.codeListDataList,
      newCodeListData,
    ];

    await uploadCodeList(user, newCodeListData.title);
    rerender(<CodeListPage {...defaultCodeListPageProps} codeListDataList={newCodeListDataList} />);

    const openItem = screen.getByRole('button', { name: newCodeListData.title, expanded: true });
    expect(openItem).toBeInTheDocument();
  });

  it('calls onUpdateCodeListId when Id is changed', async () => {
    const user = userEvent.setup();
    renderCodeListPage();
    const additionalChars = 'abc';
    const idToChange = codeList1Data.title;

    const details = getCodeListDetails(idToChange);
    const idButtonLabel = textMock('app_content_library.code_lists.code_list_edit_id_label');
    const codeListIdButton = within(details).getByRole('button', { name: idButtonLabel });
    await user.click(codeListIdButton);
    await user.keyboard(additionalChars);
    await user.tab();

    const expectedNewId = idToChange + additionalChars;
    expect(onUpdateCodeListId).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeListId).toHaveBeenCalledWith(idToChange, expectedNewId);
  });

  it('calls onUpdateCodeList with new code list when code list is changed', async () => {
    const user = userEvent.setup();
    const newValueText = 'newValueText';
    renderCodeListPage();
    const details = getCodeListDetails(codeList1Data.title);
    const codeListFirstItemValue = within(details).getByRole('textbox', {
      name: textMock('code_list_editor.value_item', { number: 1 }),
    });

    await user.type(codeListFirstItemValue, newValueText);
    await user.tab();

    expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeList).toHaveBeenLastCalledWith({
      codeList: expect.arrayContaining([expect.objectContaining({ value: newValueText })]),
      title: codeList1Data.title,
    });
  });

  it('calls onUploadCodeList with the new code list when the user uploads a code list', async () => {
    const user = userEvent.setup();
    renderCodeListPage();
    await uploadCodeList(user, 'test');
    expect(onUploadCodeList).toHaveBeenCalledTimes(1);
    expect(onUploadCodeList).toHaveBeenCalledWith(expect.any(Object));
  });

  it('Renders with text resources in the input fields when given', async () => {
    const user = userEvent.setup();
    renderCodeListPage({ textResources, codeListDataList: codeListDataList });
    const labelField = await openAndGetFirstLabelField(user, codeList1Data.title);
    expect(labelField).toHaveValue(label1ResourceNb.value);
  });

  it('Calls onUpdateTextResource with the new text resource and the default language when a text resource is changed', async () => {
    const user = userEvent.setup();
    const onUpdateTextResource = jest.fn();
    const newLabel = 'Ny ledetekst';

    renderCodeListPage({ textResources, codeListDataList: codeListDataList, onUpdateTextResource });
    const labelField = await openAndGetFirstLabelField(user, codeList1Data.title);
    await user.type(labelField, newLabel);
    await user.tab();

    const expectedLanguage = 'nb';
    const expectedObject: TextResourceWithLanguage = {
      language: expectedLanguage,
      textResource: { ...label1ResourceNb, value: newLabel },
    };
    expect(onUpdateTextResource).toHaveBeenCalledTimes(1);
    expect(onUpdateTextResource).toHaveBeenCalledWith(expectedObject);
  });

  it('Calls onCreateTextResource with the new text resource and the default language when a text resource is added', async () => {
    const user = userEvent.setup();
    const onCreateTextResource = jest.fn();
    const newDescription = 'Ny beskrivelse';

    renderCodeListPage({ textResources, codeListDataList: codeListDataList, onCreateTextResource });
    const emptyDescriptionField = await openAndGetFirstDescriptionField(user, codeList2Data.title);
    await user.type(emptyDescriptionField, newDescription);
    await user.tab();

    const expectedLanguage = 'nb';
    const expectedObject: TextResourceWithLanguage = {
      language: expectedLanguage,
      textResource: expect.objectContaining({ value: newDescription }),
    };
    expect(onCreateTextResource).toHaveBeenCalledTimes(1);
    expect(onCreateTextResource).toHaveBeenCalledWith(expectedObject);
  });

  it('Renders with text resources in the input fields of the create dialog when given', async () => {
    const user = userEvent.setup();

    renderCodeListPage({ textResources });
    const dialog = await openCreateDialog(user);
    await addCodeListItem(user, dialog);
    await openSearchModeForFirstLabel(user, dialog);
    await openFirstLabelCombobox(user, dialog);

    expect(getTextResourceOption(label1ResourceNb)).toBeInTheDocument();
  });

  it('Calls onUpdateTextResource with the new text resource and the default language when a text resource is changed in the create dialog', async () => {
    const user = userEvent.setup();
    const onUpdateTextResource = jest.fn();
    const newLabel = 'Ny ledetekst';

    renderCodeListPage({ textResources, onUpdateTextResource });
    const dialog = await openCreateDialog(user);
    await addCodeListItem(user, dialog);
    await openSearchModeForFirstLabel(user, dialog);
    await openFirstLabelCombobox(user, dialog);
    await user.click(getTextResourceOption(label1ResourceNb));
    await openEditModeForFirstLabel(user, dialog);
    await user.type(getFirstLabelField(dialog), newLabel);
    await user.tab();

    const expectedLanguage = 'nb';
    const expectedObject: TextResourceWithLanguage = {
      language: expectedLanguage,
      textResource: { ...label1ResourceNb, value: newLabel },
    };
    expect(onUpdateTextResource).toHaveBeenCalledTimes(1);
    expect(onUpdateTextResource).toHaveBeenCalledWith(expectedObject);
  });

  it('Calls onCreateTextResource with the new text resource and the default language when a text resource is added in the create dialog', async () => {
    const user = userEvent.setup();
    const onCreateTextResource = jest.fn();
    const newLabel = 'Ny ledetekst';

    renderCodeListPage({ textResources, onCreateTextResource });
    const dialog = await openCreateDialog(user);
    await addCodeListItem(user, dialog);
    await user.type(getFirstLabelField(dialog), newLabel);
    await user.tab();

    const expectedLanguage = 'nb';
    const expectedObject: TextResourceWithLanguage = {
      language: expectedLanguage,
      textResource: expect.objectContaining({ value: newLabel }),
    };
    expect(onCreateTextResource).toHaveBeenCalledTimes(1);
    expect(onCreateTextResource).toHaveBeenCalledWith(expectedObject);
  });

  it('renders an info box when no code lists are passed', () => {
    renderCodeListPage({ codeListDataList: [] });
    const alert = screen.getByText(textMock('app_content_library.code_lists.info_box.title'));
    expect(alert).toBeInTheDocument();
  });

  it('does not render an info box when code lists are passed', () => {
    renderCodeListPage();
    const alert = screen.queryByText(textMock('app_content_library.code_lists.info_box.title'));
    expect(alert).not.toBeInTheDocument();
  });
});

const uploadCodeList = async (user: UserEvent, fileName: string): Promise<void> => {
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
  await user.click(getCodeListHeading(codeListTitle));
  const details = getCodeListDetails(codeListTitle);
  return getFirstLabelField(details);
};

const getFirstLabelField = (area: HTMLElement): HTMLElement => {
  const labelFieldLabel = textMock('code_list_editor.text_resource.label.value', { number: 1 });
  return within(area).getByRole('textbox', { name: labelFieldLabel });
};

const openAndGetFirstDescriptionField = async (
  user: UserEvent,
  codeListTitle: string,
): Promise<HTMLElement> => {
  await user.click(getCodeListHeading(codeListTitle));
  const details = getCodeListDetails(codeListTitle);
  return getFirstDescriptionField(details);
};

const getFirstDescriptionField = (area: HTMLElement): HTMLElement => {
  const inputLabelKey = 'code_list_editor.text_resource.description.value';
  const descriptionFieldLabel = textMock(inputLabelKey, { number: 1 });
  return within(area).getByRole('textbox', { name: descriptionFieldLabel });
};

const getCodeListDetails = (codeListTitle: string): HTMLElement =>
  // The following code accesses a node directly with parentElement. This is not recommended, hence the Eslint rule, but there is no other way to access the details element.
  // Todo: Use getByRole('group') when the role becomes correctly assigned to the component: https://github.com/digdir/designsystemet/issues/3941
  getCodeListHeading(codeListTitle).parentElement; // eslint-disable-line testing-library/no-node-access

const getCodeListHeading = (codeListTitle: string): HTMLElement =>
  screen.getByRole('button', { name: codeListTitle });

const queryCodeListHeading = (codeListTitle: string): HTMLElement =>
  screen.queryByRole('button', { name: codeListTitle });

const renderCodeListPage = (props: Partial<CodeListPageProps> = {}): RenderResult =>
  render(<CodeListPage {...defaultCodeListPageProps} {...props} />);

const openCreateDialog = async (user: UserEvent): Promise<HTMLElement> => {
  const createButtonLabel = textMock('app_content_library.code_lists.create_new_code_list');
  await user.click(screen.getByRole('button', { name: createButtonLabel }));
  return screen.getByRole('dialog');
};

const addCodeListItem = async (user: UserEvent, area: HTMLElement): Promise<void> => {
  const addButtonLabel = textMock('code_list_editor.add_option');
  await user.click(within(area).getByRole('button', { name: addButtonLabel }));
};

const openSearchModeForFirstLabel = async (user: UserEvent, area: HTMLElement): Promise<void> => {
  const radioLabel = textMock('code_list_editor.text_resource.label.search_mode', { number: 1 });
  const radio = within(area).getByRole('radio', { name: radioLabel });
  await user.click(radio);
};

const openEditModeForFirstLabel = async (user: UserEvent, area: HTMLElement): Promise<void> => {
  const radioLabel = textMock('code_list_editor.text_resource.label.edit_mode', { number: 1 });
  const radio = await within(area).findByRole('radio', { name: radioLabel });
  await user.click(radio);
};

const openFirstLabelCombobox = async (user: UserEvent, area: HTMLElement): Promise<void> => {
  const comboboxLabel = textMock('code_list_editor.text_resource.label.select', { number: 1 });
  const combobox = within(area).getByRole('combobox', { name: comboboxLabel });
  await user.click(combobox);
};

const getTextResourceOption = (textResource: TextResource): HTMLElement =>
  screen.getByRole('option', { name: retrieveOptionName(textResource) });

const retrieveOptionName = ({ value, id }: TextResource): string => `${value} ${id}`;
