import React from 'react';
import { render, screen } from '@testing-library/react';

import { textMock } from '@studio/testing/mocks/i18nMock';
import { CodeListsActionsBar } from './CodeListsActionsBar';
import userEvent from '@testing-library/user-event';

const onUploadCodeListMock = jest.fn();

describe('CodeListsActionsBar', () => {
  it('renders the search field with placeholder text', () => {
    renderCodeListsActionsBar();
    const searchFieldPlaceHolderText = screen.getByPlaceholderText(
      textMock('app_content_library.code_lists.search_placeholder'),
    );
    expect(searchFieldPlaceHolderText).toBeInTheDocument();
  });

  it('renders the file uploader button', () => {
    renderCodeListsActionsBar();
    const fileUploaderButton = screen.getByLabelText(
      textMock('app_content_library.code_lists.upload_code_list'),
    );
    expect(fileUploaderButton).toBeInTheDocument();
  });

  it('calls onUploadCodeList when uploading a file', async () => {
    const user = userEvent.setup();
    renderCodeListsActionsBar();
    const fileUploaderButton = screen.getByLabelText(
      textMock('app_content_library.code_lists.upload_code_list'),
    );
    const file = new File(['test'], 'fileNameMock.json', { type: 'application/json' });
    await user.upload(fileUploaderButton, file);
    expect(onUploadCodeListMock).toHaveBeenCalledTimes(1);
  });
});

const renderCodeListsActionsBar = () => {
  render(
    <CodeListsActionsBar
      onUploadCodeList={onUploadCodeListMock}
      onUpdateCodeList={jest.fn()}
      codeListNames={['codeList', 'codeList2']}
    />,
  );
};
