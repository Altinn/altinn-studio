import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CodeListsProps } from './CodeLists';
import { updateCodeListWithMetadata, CodeLists } from './CodeLists';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { CodeListWithMetadata } from '../CodeList';
import type { UserEvent } from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CodeList as StudioComponentsCodeList } from '@studio/components';

const codeListName = 'codeList';
const codeListWithMetadataMock: CodeListWithMetadata = {
  title: codeListName,
  codeList: [{ value: 'value', label: 'label' }],
};
const onUpdateCodeListMock = jest.fn();

describe('CodeLists', () => {
  it('renders the code list', () => {
    renderCodeLists();
    const codeListAccordion = screen.getByRole('button', { name: codeListName });
    expect(codeListAccordion).toBeInTheDocument();
  });

  it('renders the code list editor when opening the accordion', async () => {
    const user = userEvent.setup();
    renderCodeLists();
    await openCodeList(user);
    const codeListEditor = screen.getByText(textMock('code_list_editor.legend'));
    expect(codeListEditor).toBeVisible();
  });

  it('calls onUpdateCodeList when changing a code list', async () => {
    const user = userEvent.setup();
    const codeListValueText = 'codeListValueText';
    renderCodeLists();
    await openCodeList(user);
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
});

const openCodeList = async (user: UserEvent) => {
  const codeListAccordion = screen.getByRole('button', { name: codeListName });
  await user.click(codeListAccordion);
};

const defaultProps: CodeListsProps = {
  codeLists: [codeListWithMetadataMock],
  onUpdateCodeList: onUpdateCodeListMock,
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
