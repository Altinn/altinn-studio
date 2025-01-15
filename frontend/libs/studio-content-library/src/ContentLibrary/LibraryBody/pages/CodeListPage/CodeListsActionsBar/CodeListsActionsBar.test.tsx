import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { CodeListsActionsBarProps } from './CodeListsActionsBar';
import { CodeListsActionsBar } from './CodeListsActionsBar';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../../../test-utils/renderWithProviders';

const onUploadCodeListMock = jest.fn();
const onHandleSearchCodeListsMock = jest.fn();
const codeListName1 = 'codeListName1';
const codeListName2 = 'codeListName2';

describe('CodeListsActionsBar', () => {
  afterEach(jest.clearAllMocks);

  it('renders the search field with label', () => {
    renderCodeListsActionsBar();
    const searchFieldLabelText = screen.getByRole('searchbox', {
      name: textMock('app_content_library.code_lists.search_label'),
    });
    expect(searchFieldLabelText).toBeInTheDocument();
  });

  it('calls handleSearchCodeLists during first render to show all', async () => {
    renderCodeListsActionsBar();
    expect(onHandleSearchCodeListsMock).toHaveBeenCalledTimes(1);
    expect(onHandleSearchCodeListsMock).toHaveBeenCalledWith('.*');
  });

  it('calls handleSearchCodeLists when searching for code lists', async () => {
    const user = userEvent.setup();
    renderCodeListsActionsBar();
    const searchInput = screen.getByRole('searchbox');
    const codeListSearchParam = 'code';
    await user.type(searchInput, codeListSearchParam);
    expect(onHandleSearchCodeListsMock).toHaveBeenCalledTimes(codeListSearchParam.length + 1); // +1 due to initial run
    expect(onHandleSearchCodeListsMock).toHaveBeenCalledWith(codeListSearchParam);
  });

  it('calls handleSearchCodeLists with ".*" when clearing search', async () => {
    const user = userEvent.setup();
    renderCodeListsActionsBar();
    const searchInput = screen.getByRole('searchbox');
    const codeListSearchParam = 'code';
    await user.type(searchInput, codeListSearchParam);
    const clearSearchButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.clear_search_button_label'),
    });
    await user.click(clearSearchButton);
    expect(onHandleSearchCodeListsMock).toHaveBeenCalledTimes(codeListSearchParam.length + 2); // +2 due to initial run and clearing search
    expect(onHandleSearchCodeListsMock).toHaveBeenLastCalledWith('.*');
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

const defaultCodeListActionBarProps: CodeListsActionsBarProps = {
  onUploadCodeList: onUploadCodeListMock,
  onUpdateCodeList: jest.fn(),
  codeListNames: [codeListName1, codeListName2],
  onHandleSearchCodeLists: onHandleSearchCodeListsMock,
};

const renderCodeListsActionsBar = () => {
  return renderWithProviders(<CodeListsActionsBar {...defaultCodeListActionBarProps} />);
};
