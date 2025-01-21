import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CodeListsProps } from './CodeLists';
import { CodeLists } from './CodeLists';
import { updateCodeListWithMetadata } from './EditCodeList/EditCodeList';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { CodeListWithMetadata } from '../CodeListPage';
import type { RenderResult } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import type { CodeList as StudioComponentsCodeList } from '@studio/components';
import { codeListsDataMock } from '../../../../../../mocks/mockPagesConfig';

const codeListName = codeListsDataMock[0].title;
const onDeleteCodeListMock = jest.fn();
const onUpdateCodeListIdMock = jest.fn();
const onUpdateCodeListMock = jest.fn();

describe('CodeLists', () => {
  afterEach(jest.clearAllMocks);

  it('renders the code list accordion closed by default', () => {
    renderCodeLists();
    const codeListAccordion = screen.getByRole('button', { name: codeListName, expanded: false });
    expect(codeListAccordion).toBeInTheDocument();
    expect(codeListAccordion).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders the code list accordion open by default if code list title is equal to codeListInEditMode', () => {
    renderCodeLists({ codeListInEditMode: codeListName });
    const codeListAccordion = screen.getByRole('button', { name: codeListName, expanded: true });
    expect(codeListAccordion).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders the accordion header title without usage information if not in use', () => {
    renderCodeLists();
    const codeListAccordionHeaderSubTitleSingle = screen.queryByText(
      textMock('app_content_library.code_lists.code_list_accordion_usage_sub_title_single', {
        codeListUsagesCount: 0,
      }),
    );
    const codeListAccordionHeaderSubTitlePlural = screen.queryByText(
      textMock('app_content_library.code_lists.code_list_accordion_usage_sub_title_plural', {
        codeListUsagesCount: 0,
      }),
    );
    expect(codeListAccordionHeaderSubTitleSingle).not.toBeInTheDocument();
    expect(codeListAccordionHeaderSubTitlePlural).not.toBeInTheDocument();
  });

  it('does not render a button to view code list usages if not in use', () => {
    renderCodeLists();
    const viewCodeListUsagesButton = screen.queryByRole('button', {
      name: textMock('app_content_library.code_lists.code_list_show_usage'),
    });
    expect(viewCodeListUsagesButton).not.toBeInTheDocument();
  });

  it('renders the accordion header title with single usage information if used once', () => {
    renderCodeLists({
      codeListsUsages: [
        {
          codeListId: codeListName,
          codeListIdSources: [
            { layoutSetId: 'layoutSetId', layoutName: 'layoutName', componentIds: ['componentId'] },
          ],
        },
      ],
    });
    const codeListAccordionHeaderSubTitleSingle = screen.getByText(
      textMock('app_content_library.code_lists.code_list_accordion_usage_sub_title_single', {
        codeListUsagesCount: 1,
      }),
    );
    expect(codeListAccordionHeaderSubTitleSingle).toBeInTheDocument();
  });

  it('renders the accordion header title with plural usage information if used multiple times', () => {
    renderCodeLists({
      codeListsUsages: [
        {
          codeListId: codeListName,
          codeListIdSources: [
            {
              layoutSetId: 'layoutSetId',
              layoutName: 'layoutName',
              componentIds: ['componentId1', 'componentId2'],
            },
            { layoutSetId: 'layoutSetId', layoutName: 'layoutName', componentIds: ['componentId'] },
          ],
        },
      ],
    });
    const codeListAccordionHeaderSubTitlePlural = screen.getByText(
      textMock('app_content_library.code_lists.code_list_accordion_usage_sub_title_plural', {
        codeListUsagesCount: 3,
      }),
    );
    expect(codeListAccordionHeaderSubTitlePlural).toBeInTheDocument();
  });

  it('renders button to view code list usages if code list is in use', () => {
    renderCodeLists({
      codeListsUsages: [
        {
          codeListId: codeListName,
          codeListIdSources: [
            { layoutSetId: 'layoutSetId', layoutName: 'layoutName', componentIds: ['componentId'] },
          ],
        },
      ],
    });
    const viewCodeListUsagesButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.code_list_show_usage'),
    });
    expect(viewCodeListUsagesButton).toBeInTheDocument();
  });

  it('renders modal to see code list usages if clicking button to view code list usages', async () => {
    const user = userEvent.setup();
    renderCodeLists({
      codeListsUsages: [
        {
          codeListId: codeListName,
          codeListIdSources: [
            { layoutSetId: 'layoutSetId', layoutName: 'layoutName', componentIds: ['componentId'] },
          ],
        },
      ],
    });
    const viewCodeListUsagesButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.code_list_show_usage'),
    });
    await user.click(viewCodeListUsagesButton);
    const codeListUsagesModalTitle = screen.getByText(
      textMock('app_content_library.code_lists.code_list_show_usage_modal_title'),
    );
    expect(codeListUsagesModalTitle).toBeInTheDocument();
  });

  it('renders button to delete code list as disabled when code list is used', async () => {
    renderCodeLists({
      codeListsUsages: [
        {
          codeListId: codeListName,
          codeListIdSources: [
            { layoutSetId: 'layoutSetId', layoutName: 'layoutName', componentIds: ['componentId'] },
          ],
        },
      ],
    });
    const deleteCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.code_list_delete'),
    });
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
      codeListsUsages: [
        {
          codeListId: codeListsDataMock[0].title,
          codeListIdSources: [{ layoutSetId: '', layoutName: '', componentIds: [''] }],
        },
      ],
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

  it('renders error message if option list has error', () => {
    renderCodeLists({ codeListsData: [{ ...codeListsDataMock[0], hasError: true, data: null }] });
    const errorMessage = screen.getByText(textMock('app_content_library.code_lists.fetch_error'));
    expect(errorMessage).toBeInTheDocument();
  });

  it('calls onDeleteCodeList when clicking delete button', async () => {
    const user = userEvent.setup();
    renderCodeLists();
    const deleteCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.code_list_delete'),
    });
    expect(deleteCodeListButton.title).toBe(
      textMock('app_content_library.code_lists.code_list_delete_enabled_title'),
    );
    await user.click(deleteCodeListButton);
    expect(onDeleteCodeListMock).toHaveBeenCalledTimes(1);
    expect(onDeleteCodeListMock).toHaveBeenLastCalledWith(codeListName);
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
    textMock('app_content_library.code_lists.code_list_edit_id_title', {
      codeListName: oldCodeListId,
    }),
  );
  await user.clear(codeListIdInput);
  await user.type(codeListIdInput, newCodeListId);
  await user.tab();
};

const defaultProps: CodeListsProps = {
  codeListsData: codeListsDataMock,
  onDeleteCodeList: onDeleteCodeListMock,
  onUpdateCodeListId: onUpdateCodeListIdMock,
  onUpdateCodeList: onUpdateCodeListMock,
  codeListInEditMode: undefined,
  codeListNames: [],
  codeListsUsages: [],
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
