import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { CodeListsActionsBarProps } from './CodeListsActionsBar';
import { CodeListsActionsBar } from './CodeListsActionsBar';
import type { UserEvent } from '@testing-library/user-event';
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
      name: textMock('app_content_library.code_lists.search_label'),
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
      name: textMock('app_content_library.code_lists.clear_search_button_label'),
    });
    await user.click(clearSearchButton);
    expect(onSetSearchStringMock).toHaveBeenCalledTimes(codeListSearchParam.length + 1); // +1 due to clearing search
    expect(onSetSearchStringMock).toHaveBeenLastCalledWith('');
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

  it('opens the create new code list modal when clicking on the add new code list button', async () => {
    const user = userEvent.setup();
    renderCodeListsActionsBar();
    const addNewCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.add_new_code_list'),
    });
    await user.click(addNewCodeListButton);
    const createNewCodeListModalTitle = screen.getByText(
      textMock('app_content_library.code_lists.create_new_code_list'),
    );
    expect(createNewCodeListModalTitle).toBeInTheDocument();
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
  onSetSearchString: onSetSearchStringMock,
};

const renderCodeListsActionsBar = () => {
  return renderWithProviders(<CodeListsActionsBar {...defaultCodeListActionBarProps} />);
};
