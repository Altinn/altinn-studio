import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CodeListsProps } from './CodeLists';
import { updateCodeListWithMetadata, CodeLists } from './CodeLists';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { CodeListWithMetadata } from '../CodeListPage';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CodeList as StudioComponentsCodeList } from '@studio/components';

const codeListName = 'codeList';
const codeListWithMetadataMock: CodeListWithMetadata = {
  title: codeListName,
  codeList: [{ value: 'value', label: 'label' }],
};
const onUpdateCodeListIdMock = jest.fn();
const onUpdateCodeListMock = jest.fn();

describe('CodeLists', () => {
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

  it('calls onUpdateCodeListId when changing the code list id', async () => {
    const user = userEvent.setup();
    renderCodeLists();
    const codeListIdToggleTextfield = screen.getByTitle(
      textMock('app_content_library.code_lists.code_list_view_id_title', {
        codeListName: codeListName,
      }),
    );
    await user.click(codeListIdToggleTextfield);
    const codeListIdInput = screen.getByTitle(
      textMock('app_content_library.code_lists.code_list_edit_id_title', {
        codeListName: codeListName,
      }),
    );
    await user.type(codeListIdInput, '2');
    await user.tab();
    expect(onUpdateCodeListIdMock).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeListIdMock).toHaveBeenLastCalledWith(codeListName, codeListName + '2');
  });
});

const defaultProps: CodeListsProps = {
  codeLists: [codeListWithMetadataMock],
  onUpdateCodeListId: onUpdateCodeListIdMock,
  onUpdateCodeList: onUpdateCodeListMock,
  codeListInEditMode: undefined,
  codeListNames: [],
};

const renderCodeLists = (props: Partial<CodeListsProps> = {}): RenderResult => {
  return render(<CodeLists {...defaultProps} {...props} />);
};

describe('updateCodeListWithMetadata', () => {
  it('returns an updated CodeListWithMetadata object', () => {
    const updatedCodeList: StudioComponentsCodeList = [{ value: '', label: '' }];
    const updatedCodeListWithMetadata: CodeListWithMetadata = updateCodeListWithMetadata(
      codeListWithMetadataMock,
      updatedCodeList,
    );
    expect(updatedCodeListWithMetadata).toEqual({ title: codeListName, codeList: updatedCodeList });
  });

  it('works with an empty code list', () => {
    const updatedCodeList: StudioComponentsCodeList = [];
    const updatedCodeListWithMetadata: CodeListWithMetadata = updateCodeListWithMetadata(
      codeListWithMetadataMock,
      updatedCodeList,
    );

    expect(updatedCodeListWithMetadata).toEqual({
      title: codeListName,
      codeList: updatedCodeList,
    });
  });
});
