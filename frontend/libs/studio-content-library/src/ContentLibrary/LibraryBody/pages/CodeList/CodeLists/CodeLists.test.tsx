import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CodeListsProps } from './CodeLists';
import { CodeLists } from './CodeLists';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { CodeListWithMetadata, OnGetCodeListResult } from '../CodeList';
import userEvent from '@testing-library/user-event';

const codeListName = 'codeList';
const codeListMock: CodeListWithMetadata = {
  title: codeListName,
  codeList: [{ value: 'value', label: 'label' }],
};
const onGetCodeListMock: jest.Mock<OnGetCodeListResult, [codeListId: string]> = jest.fn(
  (codeListId: string) => {
    return { codeListWithMetadata: { title: codeListId, codeList: codeListMock }, isError: false };
  },
);

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

  it('renders error message if error fetching an option list occurred', () => {
    const onGetCodeList = jest.fn((codeListId: string) => {
      return { codeListWithMetadata: { title: codeListId, codeList: undefined }, isError: true };
    });
    renderCodeLists({ onGetCodeList });
    const errorMessage = screen.getByText(textMock('app_content_library.code_lists.fetch_error'));
    expect(errorMessage).toBeInTheDocument();
  });
});

const defaultCodeListsProps: CodeListsProps = {
  codeListIds: [codeListName],
  onGetCodeList: onGetCodeListMock,
  onUpdateCodeList: jest.fn(),
};

const renderCodeLists = (props: Partial<CodeListsProps> = {}) => {
  render(<CodeLists {...defaultCodeListsProps} {...props} />);
};
