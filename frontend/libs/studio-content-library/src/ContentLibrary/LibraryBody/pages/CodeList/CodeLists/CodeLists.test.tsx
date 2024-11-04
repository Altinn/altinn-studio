import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CodeListsProps } from './CodeLists';
import { CodeLists } from './CodeLists';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { CodeList } from '../CodeList';
import userEvent from '@testing-library/user-event';

const codeListName = 'codeList';
const codeListMock: CodeList = {
  title: codeListName,
  codeList: [{ value: 'value', label: 'label' }],
};

describe('CodeLists', () => {
  it('renders the code list', () => {
    renderCodeLists();
    const codeListAccordion = screen.getByRole('button', { name: codeListName });
    expect(codeListAccordion).toBeInTheDocument();
  });

  it('renders a placeholder information alert when opening the accordion', async () => {
    const user = userEvent.setup();
    renderCodeLists();
    const codeListAccordion = screen.getByRole('button', { name: codeListName });
    await user.click(codeListAccordion);
    const placeholderAlert = screen.getByText(
      textMock('app_content_library.code_lists.edit_code_list_placeholder_text'),
    );
    expect(placeholderAlert).toBeVisible();
  });
});

const renderCodeLists = (
  { codeLists }: Partial<CodeListsProps> = { codeLists: [codeListMock] },
) => {
  render(<CodeLists codeLists={codeLists} onUpdateCodeList={jest.fn()} />);
};
