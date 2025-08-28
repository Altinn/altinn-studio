import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../../../../test-utils/renderWithProviders';
import type { AddCodeListDropdownProps } from './AddCodeListDropdown';
import { AddCodeListDropdown } from './AddCodeListDropdown';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { UserEvent } from '@testing-library/user-event';
import { externalResources } from '../../../../../../test-data/externalResources';

const onUploadCodeListMock = jest.fn();
const codeListName1 = 'codeListName1';
const codeListName2 = 'codeListName2';

describe('AddCodeListDropdown', () => {
  afterEach(jest.clearAllMocks);

  it('opens the create new code list modal when clicking on the add new code list button', async () => {
    const user = userEvent.setup();
    renderAddCodeListDropdown();
    const addNewCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.add_new_code_list'),
    });
    await user.click(addNewCodeListButton);
    const createNewCodeListModalTitle = screen.getByText(
      textMock('app_content_library.code_lists.create_new_code_list'),
    );
    expect(createNewCodeListModalTitle).toBeInTheDocument();
  });

  it('calls onUploadCodeList when uploading a file', async () => {
    const user = userEvent.setup();
    renderAddCodeListDropdown();
    const fileUploaderButton = screen.getByLabelText(
      textMock('app_content_library.code_lists.upload_code_list'),
    );
    const file = new File(['test'], 'fileNameMock.json', { type: 'application/json' });
    await user.upload(fileUploaderButton, file);
    expect(onUploadCodeListMock).toHaveBeenCalledTimes(1);
  });

  it('does not call onUploadCodeList when uploading a file with existing file name', async () => {
    const user = userEvent.setup();
    renderAddCodeListDropdown();
    await uploadFileWithFileName(user, `${codeListName1}.json`);
    expect(onUploadCodeListMock).not.toHaveBeenCalled();
  });

  it('renders correct toast error message when uploading a file with existing file name', async () => {
    const user = userEvent.setup();
    renderAddCodeListDropdown();
    await uploadFileWithFileName(user, `${codeListName1}.json`);
    const toastErrorText = screen.getByText(
      textMock('validation_errors.upload_file_name_occupied'),
    );
    expect(toastErrorText).toBeInTheDocument();
  });

  it('does not call onUploadCodeList when uploading a file with file name not matching regex', async () => {
    const user = userEvent.setup();
    renderAddCodeListDropdown();
    await uploadFileWithFileName(user, 'æ.json');
    expect(onUploadCodeListMock).not.toHaveBeenCalled();
  });

  it('renders correct toast error message when uploading a file with file name not matching regex', async () => {
    const user = userEvent.setup();
    renderAddCodeListDropdown();
    await uploadFileWithFileName(user, 'æ.json');
    const toastErrorText = screen.getByText(textMock('validation_errors.file_name_invalid'));
    expect(toastErrorText).toBeInTheDocument();
  });

  it('does not call onUploadCodeList when uploading a file with empty name', async () => {
    const user = userEvent.setup();
    renderAddCodeListDropdown();
    await uploadFileWithFileName(user, '.json');
    expect(onUploadCodeListMock).not.toHaveBeenCalled();
  });

  it('renders correct toast error message when uploading a file with empty name', async () => {
    const user = userEvent.setup();
    renderAddCodeListDropdown();
    await uploadFileWithFileName(user, '.json');
    const toastErrorText = screen.getByText(
      textMock('validation_errors.upload_file_name_required'),
    );
    expect(toastErrorText).toBeInTheDocument();
  });

  it('opens the import code list dialog when clicking on the import menu button', async () => {
    const user = userEvent.setup();
    renderAddCodeListDropdown({ externalResources });
    const importCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.import_from_org_library'),
    });
    await user.click(importCodeListButton);
    const importCodeListDialogTitle = screen.getByRole('heading', {
      name: textMock('app_content_library.code_lists.import_modal_heading'),
    });
    expect(importCodeListDialogTitle).toBeInTheDocument();
  });

  it('does not display the import button when there are no external resources', () => {
    renderAddCodeListDropdown();
    const importButton = screen.queryByRole('button', {
      name: textMock('app_content_library.code_lists.import_from_org_library'),
    });
    expect(importButton).not.toBeInTheDocument();
  });
});

const uploadFileWithFileName = async (user: UserEvent, fileNameWithExtension: string) => {
  const fileUploaderButton = screen.getByLabelText(
    textMock('app_content_library.code_lists.upload_code_list'),
  );
  const file = new File(['test'], fileNameWithExtension, { type: 'application/json' });
  await user.upload(fileUploaderButton, file);
};

const defaultCodeListActionBarProps: AddCodeListDropdownProps = {
  onUploadCodeList: onUploadCodeListMock,
  onCreateCodeList: jest.fn(),
  codeListNames: [codeListName1, codeListName2],
};

const renderAddCodeListDropdown = (props: Partial<AddCodeListDropdownProps> = {}) => {
  return renderWithProviders(<AddCodeListDropdown {...defaultCodeListActionBarProps} {...props} />);
};
