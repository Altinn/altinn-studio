import React from 'react';
import { screen } from '@testing-library/react';

import { textMock } from '@studio/testing/mocks/i18nMock';
import { CodeListsActionsBar } from './CodeListsActionsBar';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../../../test-utils/renderWithProviders';

const onUploadCodeListMock = jest.fn();
const codeListName1 = 'codeListName1';
const codeListName2 = 'codeListName2';

describe('CodeListsActionsBar', () => {
  afterEach(jest.clearAllMocks);

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

  it('does not call onUploadCodeList when uploading a file with existing file name', async () => {
    const user = userEvent.setup();
    renderCodeListsActionsBar();
    const fileUploaderButton = screen.getByLabelText(
      textMock('app_content_library.code_lists.upload_code_list'),
    );
    const file = new File(['test'], `${codeListName1}.json`, { type: 'application/json' });
    await user.upload(fileUploaderButton, file);
    expect(onUploadCodeListMock).not.toHaveBeenCalled();
  });

  it('renders correct toast error message when uploading a file with existing file name', async () => {
    const user = userEvent.setup();
    renderCodeListsActionsBar();
    const fileUploaderButton = screen.getByLabelText(
      textMock('app_content_library.code_lists.upload_code_list'),
    );
    const file = new File(['test'], `${codeListName1}.json`, { type: 'application/json' });
    await user.upload(fileUploaderButton, file);
    const toastErrorText = screen.getByText(
      textMock('validation_errors.upload_file_name_occupied'),
    );
    expect(toastErrorText).toBeInTheDocument();
  });

  it('renders correct toast error message when uploading a file with empty name', async () => {
    const user = userEvent.setup();
    renderCodeListsActionsBar();
    const fileUploaderButton = screen.getByLabelText(
      textMock('app_content_library.code_lists.upload_code_list'),
    );
    const file = new File(['test'], '.json', { type: 'application/json' });
    await user.upload(fileUploaderButton, file);
    expect(onUploadCodeListMock).not.toHaveBeenCalled();
    const toastErrorText = screen.getByText(
      textMock('validation_errors.upload_file_name_required'),
    );
    expect(toastErrorText).toBeInTheDocument();
  });
});

const renderCodeListsActionsBar = () => {
  renderWithProviders(
    <CodeListsActionsBar
      onUploadCodeList={onUploadCodeListMock}
      onUpdateCodeList={jest.fn()}
      codeListNames={[codeListName1, codeListName2]}
    />,
  );
};
