import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import type { CodeListsProps } from './CodeLists';
import { CodeLists } from './CodeLists';
import { updateCodeListWithMetadata } from './EditCodeList/EditCodeList';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { CodeListWithMetadata } from '../types/CodeListWithMetadata';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import type { CodeList as StudioComponentsCodeList } from '@studio/components-legacy';
import { codeListsDataMock } from '../../../../../../mocks/mockPagesConfig';
import { CodeListUsageTaskType } from '../../../../../types/CodeListUsageTaskType';
import type { CodeListIdSource, CodeListReference } from '../types/CodeListReference';
import { textResourcesNb } from '../../../../../test-data/textResources';

const onDeleteCodeListMock = jest.fn();
const onUpdateCodeListIdMock = jest.fn();
const onUpdateCodeListMock = jest.fn();

const codeListName = codeListsDataMock[0].title;
const codeListUsageSourceMock1: CodeListIdSource = {
  taskType: CodeListUsageTaskType.Data,
  taskId: 'taskId',
  layoutName: 'layoutName',
  componentIds: ['componentId'],
};
const codeListUsageSourceMock2: CodeListIdSource = {
  taskType: CodeListUsageTaskType.Signing,
  taskId: 'taskId',
  layoutName: 'layoutName',
  componentIds: ['componentId1', 'componentId2'],
};
const codeListSingleUsageMock: CodeListReference[] = [
  {
    codeListId: codeListName,
    codeListIdSources: [codeListUsageSourceMock1],
  },
];
const codeListMultipleUsagesMock: CodeListReference[] = [
  {
    codeListId: codeListName,
    codeListIdSources: [codeListUsageSourceMock1, codeListUsageSourceMock2],
  },
];

describe('CodeLists', () => {
  afterEach(jest.clearAllMocks);

  it('renders the code list details closed by default', () => {
    renderCodeLists();
    const isExpanded = false;
    const codeListDetails = getButton(codeListName, isExpanded);
    expect(codeListDetails).toBeInTheDocument();
    expect(codeListDetails).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders the code list details open by default if code list title is equal to codeListInEditMode', () => {
    renderCodeLists({ codeListInEditMode: codeListName });
    const isExpanded = true;
    const codeListDetails = getButton(codeListName, isExpanded);
    expect(codeListDetails).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders the details header title without usage information if not in use', () => {
    renderCodeLists();
    const codeListDetailsHeaderSubTitleSingle = queryButton(
      textMock('app_content_library.code_lists.code_list_details_usage_sub_title_single', {
        codeListUsagesCount: 0,
      }),
    );
    const codeListDetailsHeaderSubTitlePlural = screen.queryByText(
      textMock('app_content_library.code_lists.code_list_details_usage_sub_title_plural', {
        codeListUsagesCount: 0,
      }),
    );
    expect(codeListDetailsHeaderSubTitleSingle).not.toBeInTheDocument();
    expect(codeListDetailsHeaderSubTitlePlural).not.toBeInTheDocument();
  });

  it('does not render a button to view code list usages if not in use', () => {
    renderCodeLists();
    const viewCodeListUsagesButton = queryButton(
      textMock('app_content_library.code_lists.code_list_show_usage'),
    );
    expect(viewCodeListUsagesButton).not.toBeInTheDocument();
  });

  it('renders the details header title with single usage information if used once', () => {
    renderCodeLists({ codeListsUsages: codeListSingleUsageMock });
    const codeListDetailsHeaderSubTitleSingle = screen.getByText(
      textMock('app_content_library.code_lists.code_list_details_usage_sub_title_single', {
        codeListUsagesCount: 1,
      }),
    );
    expect(codeListDetailsHeaderSubTitleSingle).toBeInTheDocument();
  });

  it('renders the details header title with plural usage information if used multiple times', () => {
    renderCodeLists({ codeListsUsages: codeListMultipleUsagesMock });
    const codeListDetailsHeaderSubTitlePlural = screen.getByText(
      textMock('app_content_library.code_lists.code_list_details_usage_sub_title_plural', {
        codeListUsagesCount: 3,
      }),
    );
    expect(codeListDetailsHeaderSubTitlePlural).toBeInTheDocument();
  });

  it('renders button to view code list usages if code list is in use', () => {
    renderCodeLists({ codeListsUsages: codeListSingleUsageMock });
    const viewCodeListUsagesButton = getButton(
      textMock('app_content_library.code_lists.code_list_show_usage'),
    );
    expect(viewCodeListUsagesButton).toBeInTheDocument();
  });

  it('renders modal to see code list usages if clicking button to view code list usages', async () => {
    const user = userEvent.setup();
    renderCodeLists({ codeListsUsages: codeListSingleUsageMock });
    const viewCodeListUsagesButton = getButton(
      textMock('app_content_library.code_lists.code_list_show_usage'),
    );
    await user.click(viewCodeListUsagesButton);
    const codeListUsagesModalTitle = screen.getByText(
      textMock('app_content_library.code_lists.code_list_show_usage_modal_title'),
    );
    expect(codeListUsagesModalTitle).toBeInTheDocument();
  });

  it('renders button to delete code list as disabled when code list is used', async () => {
    renderCodeLists({ codeListsUsages: codeListSingleUsageMock });
    const deleteCodeListButton = getButton(
      textMock('app_content_library.code_lists.code_list_delete'),
    );
    expect(deleteCodeListButton).toBeDisabled();
    expect(deleteCodeListButton.title).toBe(
      textMock('app_content_library.code_lists.code_list_delete_disabled_title'),
    );
  });

  it('renders the code list editor', () => {
    renderCodeLists();
    const codeListEditor = screen.getByText(textMock('code_list_editor.legend'));
    expect(codeListEditor).toBeInTheDocument();
  });

  it('calls onUpdateCodeList when changing a code list', async () => {
    const user = userEvent.setup();
    const codeListValueText = 'codeListValueText';
    renderCodeLists();
    const codeListFirstItemValue = screen.getByLabelText(
      textMock('code_list_editor.value_item', { number: 1 }),
    );
    await user.type(codeListFirstItemValue, codeListValueText);
    await user.tab();

    expect(onUpdateCodeListMock).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeListMock).toHaveBeenLastCalledWith({
      codeList: [expect.objectContaining({ value: codeListValueText })],
      title: codeListName,
    });
  });

  it('Calls onUpdateCodeList and onCreateTextResource when creating a new text resource', async () => {
    const user = userEvent.setup();
    const codeListValueText = 'codeListValueText';
    const onCreateTextResource = jest.fn();
    const textResources = [{ id: 'test', value: 'some value' }];
    renderCodeLists({ onCreateTextResource, textResources });

    const codeListFirstItemLabel = screen.getByRole('textbox', {
      name: textMock('code_list_editor.text_resource.label.value', { number: 1 }),
    });
    await user.type(codeListFirstItemLabel, codeListValueText);
    await user.tab();

    expect(onUpdateCodeListMock).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeListMock).toHaveBeenLastCalledWith({
      codeList: expect.any(Array),
      title: codeListName,
    });
    expect(onCreateTextResource).toHaveBeenCalledTimes(1);
    expect(onCreateTextResource).toHaveBeenLastCalledWith({
      id: expect.any(String),
      value: codeListValueText,
    });
  });

  it('renders the code list title label', () => {
    renderCodeLists();
    const codeListTitleLabel = screen.getByText(
      textMock('app_content_library.code_lists.code_list_edit_id_label'),
    );
    expect(codeListTitleLabel).toBeInTheDocument();
  });

  it('calls onUpdateCodeListId when changing the code list id', async () => {
    const user = userEvent.setup();
    renderCodeLists();
    await changeCodeListId(user, codeListName, codeListName + '2');
    expect(onUpdateCodeListIdMock).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeListIdMock).toHaveBeenLastCalledWith(codeListName, codeListName + '2');
  });

  it('renders display tile instead of edit button when the code list is in use', async () => {
    renderCodeLists({
      codeListsUsages: codeListSingleUsageMock,
    });
    const codeListId = screen.getByTitle(
      textMock('app_content_library.code_lists.code_list_edit_id_disabled_title'),
    );
    expect(codeListId).toBeInTheDocument();
    expect(codeListId).not.toHaveAttribute('role', 'button');
  });

  it('shows error message when assigning an invalid id to the code list', async () => {
    const user = userEvent.setup();
    const invalidCodeListName = 'invalidCodeListName';
    renderCodeLists({ codeListNames: [invalidCodeListName] });
    await changeCodeListId(user, codeListName, invalidCodeListName);
    const errorMessage = screen.getByText(textMock('validation_errors.file_name_occupied'));
    expect(errorMessage).toBeInTheDocument();
  });

  it('does not show error message when reassigning the original name ', async () => {
    const user = userEvent.setup();
    renderCodeLists({ codeListNames: [codeListName] });
    await changeCodeListId(user, codeListName, codeListName);
    const errorMessage = screen.queryByText(textMock('validation_errors.file_name_occupied'));
    expect(errorMessage).not.toBeInTheDocument();
  });

  it('does not call onUpdateCodeListId when assigning an invalid id to the code list', async () => {
    const user = userEvent.setup();
    const invalidCodeListName = 'invalidCodeListName';
    renderCodeLists({ codeListNames: [invalidCodeListName] });
    await changeCodeListId(user, codeListName, invalidCodeListName);
    expect(onUpdateCodeListIdMock).not.toHaveBeenCalled();
  });

  it('renders error message if option list has format error', () => {
    renderCodeLists({
      codeListDataList: [{ ...codeListsDataMock[0], hasError: true, data: null }],
    });
    const errorMessage = screen.getByText(textMock('app_content_library.code_lists.format_error'));
    expect(errorMessage).toBeInTheDocument();
  });

  it('calls onDeleteCodeList when the user clicks the delete button and confirms', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => true);

    renderCodeLists();
    const deleteCodeListButton = getButton(
      textMock('app_content_library.code_lists.code_list_delete'),
    );
    expect(deleteCodeListButton.title).toBe(
      textMock('app_content_library.code_lists.code_list_delete_enabled_title'),
    );
    await user.click(deleteCodeListButton);
    expect(onDeleteCodeListMock).toHaveBeenCalledTimes(1);
    expect(onDeleteCodeListMock).toHaveBeenLastCalledWith(codeListName);
  });

  it('does not call onDeleteCodeList when it is not confirmed', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(() => false);

    renderCodeLists();
    const deleteCodeListButton = getButton(
      textMock('app_content_library.code_lists.code_list_delete'),
    );
    expect(deleteCodeListButton.title).toBe(
      textMock('app_content_library.code_lists.code_list_delete_enabled_title'),
    );
    await user.click(deleteCodeListButton);
    expect(onDeleteCodeListMock).toHaveBeenCalledTimes(0);
  });
});

const changeCodeListId = async (user: UserEvent, oldCodeListId: string, newCodeListId: string) => {
  const codeListIdToggleTextfield = screen.getByTitle(
    textMock('app_content_library.code_lists.code_list_view_id_title', {
      codeListName: oldCodeListId,
    }),
  );
  await user.click(codeListIdToggleTextfield);
  const codeListIdInput = screen.getByTitle(
    textMock('app_content_library.code_lists.code_list_view_id_title', {
      codeListName: oldCodeListId,
    }),
  );
  await user.clear(codeListIdInput);
  await user.type(codeListIdInput, newCodeListId);
  await user.tab();
};

const defaultProps: CodeListsProps = {
  codeListDataList: codeListsDataMock,
  onDeleteCodeList: onDeleteCodeListMock,
  onUpdateCodeListId: onUpdateCodeListIdMock,
  onUpdateCodeList: onUpdateCodeListMock,
  codeListInEditMode: undefined,
  codeListNames: [],
  codeListsUsages: [],
  textResources: textResourcesNb,
};

const renderCodeLists = (props: Partial<CodeListsProps> = {}): RenderResult => {
  return render(<CodeLists {...defaultProps} {...props} />);
};

describe('updateCodeListWithMetadata', () => {
  it('returns an updated CodeListWithMetadata object', () => {
    const updatedCodeList: StudioComponentsCodeList = [{ value: '', label: '' }];
    const updatedCodeListWithMetadata: CodeListWithMetadata = updateCodeListWithMetadata(
      { title: codeListsDataMock[0].title, codeList: codeListsDataMock[0].data },
      updatedCodeList,
    );
    expect(updatedCodeListWithMetadata).toEqual({
      title: codeListsDataMock[0].title,
      codeList: updatedCodeList,
    });
  });

  it('works with an empty code list', () => {
    const updatedCodeList: StudioComponentsCodeList = [];
    const updatedCodeListWithMetadata: CodeListWithMetadata = updateCodeListWithMetadata(
      { title: codeListsDataMock[0].title, codeList: codeListsDataMock[0].data },
      updatedCodeList,
    );

    expect(updatedCodeListWithMetadata).toEqual({
      title: codeListsDataMock[0].title,
      codeList: updatedCodeList,
    });
  });
});

const getButton = (name: string, expanded?: boolean) =>
  screen.getByRole('button', { name, expanded });

const queryButton = (name: string) => screen.queryByRole('button', { name });
