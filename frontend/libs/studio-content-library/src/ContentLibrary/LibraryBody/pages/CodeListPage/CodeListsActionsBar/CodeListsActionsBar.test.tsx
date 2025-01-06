import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { CodeListsActionsBar } from './CodeListsActionsBar';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../../../test-utils/renderWithProviders';

const onUploadCodeListMock = jest.fn();
const codeListName1 = 'codeListName1';
const codeListName2 = 'codeListName2';

describe('CodeListsActionsBar', () => {
  afterEach(jest.clearAllMocks);

  it('renders the search field with label', () => {
    renderCodeListsActionsBar();
    const searchFieldLabelText = screen.getByText(
      textMock('app_content_library.code_lists.search_label'),
    );
    expect(searchFieldLabelText).toBeInTheDocument();
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
    await uploadFileWithFileName(user, `${codeListName1}.json`);
    expect(onUploadCodeListMock).not.toHaveBeenCalled();
  });

  it('renders correct toast error message when uploading a file with existing file name', async () => {
    const user = userEvent.setup();
    renderCodeListsActionsBar();
    await uploadFileWithFileName(user, `${codeListName1}.json`);
    const toastErrorText = screen.getByText(
      textMock('validation_errors.upload_file_name_occupied'),
    );
    expect(toastErrorText).toBeInTheDocument();
  });

  it('does not call onUploadCodeList when uploading a file with file name not matching regex', async () => {
    const user = userEvent.setup();
    renderCodeListsActionsBar();
    await uploadFileWithFileName(user, 'æ.json');
    expect(onUploadCodeListMock).not.toHaveBeenCalled();
  });

  it('renders correct toast error message when uploading a file with file name not matching regex', async () => {
    const user = userEvent.setup();
    renderCodeListsActionsBar();
    await uploadFileWithFileName(user, 'æ.json');
    const toastErrorText = screen.getByText(textMock('validation_errors.file_name_invalid'));
    expect(toastErrorText).toBeInTheDocument();
  });

  it('does not call onUploadCodeList when uploading a file with empty name', async () => {
    const user = userEvent.setup();
    renderCodeListsActionsBar();
    await uploadFileWithFileName(user, '.json');
    expect(onUploadCodeListMock).not.toHaveBeenCalled();
  });

  it('renders correct toast error message when uploading a file with empty name', async () => {
    const user = userEvent.setup();
    renderCodeListsActionsBar();
    await uploadFileWithFileName(user, '.json');
    const toastErrorText = screen.getByText(
      textMock('validation_errors.upload_file_name_required'),
    );
    expect(toastErrorText).toBeInTheDocument();
  });
});

const uploadFileWithFileName = async (user: UserEvent, fileNameWithExtension: string) => {
  const fileUploaderButton = screen.getByLabelText(
    textMock('app_content_library.code_lists.upload_code_list'),
  );
  const file = new File(['test'], fileNameWithExtension, { type: 'application/json' });
  await user.upload(fileUploaderButton, file);
};

const renderCodeListsActionsBar = () => {
  renderWithProviders(
    <CodeListsActionsBar
      onUploadCodeList={onUploadCodeListMock}
      onUpdateCodeList={jest.fn()}
      codeListNames={[codeListName1, codeListName2]}
    />,
  );
};
