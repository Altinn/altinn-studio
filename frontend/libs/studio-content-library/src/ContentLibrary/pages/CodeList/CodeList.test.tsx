import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CodeListProps } from './CodeList';
import { CodeList } from './CodeList';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

const onUpdateCodeListMock = jest.fn();
const codeListMock: CodeList = {
  title: 'codeList',
  codeList: {},
};

describe('CodeList', () => {
  it('renders the codeList heading', () => {
    renderCodeList();
    const codeListHeading = screen.getByRole('heading', {
      name: textMock('app_content_library.code_lists.page_name'),
    });
    expect(codeListHeading).toBeInTheDocument();
  });

  it('renders an alert when no codeLists are passed', () => {
    renderCodeList({ codeLists: [], onUpdateCodeList: onUpdateCodeListMock });
    const noCodeListsExistAlert = screen.getByText(
      textMock('app_content_library.code_lists.no_content'),
    );
    expect(noCodeListsExistAlert).toBeInTheDocument();
  });

  it('calls onUpdateCodeListMock when clicking the button to update', async () => {
    const user = userEvent.setup();
    renderCodeList();
    const updateCodeListButton = screen.getByRole('button', { name: 'Oppdater kodeliste' });
    await user.click(updateCodeListButton);
    expect(onUpdateCodeListMock).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeListMock).toHaveBeenCalledWith(codeListMock);
  });
});

const defaultCodeListProps: CodeListProps = {
  codeLists: [codeListMock],
  onUpdateCodeList: onUpdateCodeListMock,
};

const renderCodeList = (codeListProps: CodeListProps = defaultCodeListProps) => {
  render(<CodeList {...codeListProps} />);
};
