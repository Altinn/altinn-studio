import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { CodeListsActionsBarProps } from './CodeListsActionsBar';
import { CodeListsActionsBar } from './CodeListsActionsBar';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../../../test-utils/renderWithProviders';

const onUploadCodeListMock = jest.fn();
const onSetSearchStringMock = jest.fn();
const codeListName1 = 'codeListName1';
const codeListName2 = 'codeListName2';

describe('CodeListsActionsBar', () => {
  afterEach(jest.clearAllMocks);

  it('renders the search field with label', () => {
    renderCodeListsActionsBar();
    const searchFieldLabelText = screen.getByRole('searchbox', {
      name: textMock('app_content_library.code_lists_with_text_resources.search_label'),
    });
    expect(searchFieldLabelText).toBeInTheDocument();
  });

  it('calls onSetCodeListSearchPatternMock when searching for code lists', async () => {
    const user = userEvent.setup();
    renderCodeListsActionsBar();
    const searchInput = screen.getByRole('searchbox');
    const codeListSearchParam = 'code';
    await user.type(searchInput, codeListSearchParam);
    expect(onSetSearchStringMock).toHaveBeenCalledTimes(codeListSearchParam.length);
    expect(onSetSearchStringMock).toHaveBeenCalledWith(codeListSearchParam);
  });

  it('calls onSetCodeListSearchPatternMock with empty string when clearing search', async () => {
    const user = userEvent.setup();
    renderCodeListsActionsBar();
    const searchInput = screen.getByRole('searchbox');
    const codeListSearchParam = 'code';
    await user.type(searchInput, codeListSearchParam);
    const clearSearchButton = screen.getByRole('button', {
      name: textMock('general.search_clear_button_title'),
    });
    await user.click(clearSearchButton);
    expect(onSetSearchStringMock).toHaveBeenCalledTimes(codeListSearchParam.length + 1); // +1 due to clearing search
    expect(onSetSearchStringMock).toHaveBeenLastCalledWith('');
  });
});

const defaultCodeListActionBarProps: CodeListsActionsBarProps = {
  onUploadCodeList: onUploadCodeListMock,
  onCreateCodeList: jest.fn(),
  codeListNames: [codeListName1, codeListName2],
  onSetSearchString: onSetSearchStringMock,
};

const renderCodeListsActionsBar = () => {
  return renderWithProviders(<CodeListsActionsBar {...defaultCodeListActionBarProps} />);
};
