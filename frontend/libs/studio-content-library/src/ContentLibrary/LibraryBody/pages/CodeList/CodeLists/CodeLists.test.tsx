import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CodeListsProps } from './CodeLists';
import { CodeLists } from './CodeLists';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { CodeListWithMetadata } from '../CodeList';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';

const codeListName = 'codeList';
const codeListMock: CodeListWithMetadata = {
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
    renderCodeLists();
    await openCodeList(user);
    const codeListFirstItemValue = screen.getByLabelText(
      textMock('code_list_editor.value_item', { number: 1 }),
    );
    await user.type(codeListFirstItemValue, 'Test');
    expect(onUpdateCodeListMock).toHaveBeenCalledTimes(4);
    expect(onUpdateCodeListMock).toHaveBeenLastCalledWith({
      codeList: [expect.objectContaining({ value: 'Test' })],
      title: codeListName,
    });
  });
});

const openCodeList = async (user: UserEvent) => {
  const codeListAccordion = screen.getByRole('button', { name: codeListName });
  await user.click(codeListAccordion);
};

const renderCodeLists = (
  { codeLists }: Partial<CodeListsProps> = { codeLists: [codeListMock] },
) => {
  render(<CodeLists codeLists={codeLists} onUpdateCodeList={onUpdateCodeListMock} />);
};
