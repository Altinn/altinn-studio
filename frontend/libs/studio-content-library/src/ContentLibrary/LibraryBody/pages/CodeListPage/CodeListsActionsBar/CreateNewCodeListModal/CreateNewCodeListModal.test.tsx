import React from 'react';
import { render, screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import { CreateNewCodeListModal } from './CreateNewCodeListModal';
import { textMock } from '@studio/testing/mocks/i18nMock';

const onUpdateCodeListMock = jest.fn();
const newCodeListTitleMock = 'newCodeListTitleMock';
const existingCodeListTitle = 'existingCodeListTitle';

describe('CreateNewCodeListModal', () => {
  afterEach(jest.clearAllMocks);

  it('open dialog when clicking "create new code list" button', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListModal();
    await openDialog(user);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders an empty textfield for inputting code list name', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListModal();
    await openDialog(user);
    const codeListNameInput = screen.getByRole('textbox', {
      name: textMock('app_content_library.code_lists.create_new_code_list_name'),
    });
    expect(codeListNameInput).toHaveTextContent('');
  });

  it('renders the code list editor without content', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListModal();
    await openDialog(user);
    const codeListIsEmptyMessage = screen.getByText(textMock('code_list_editor.empty'));
    expect(codeListIsEmptyMessage).toBeInTheDocument();
  });

  it('renders a disabled button by default', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListModal();
    await openDialog(user);
    const saveCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.save_new_code_list'),
    });
    expect(saveCodeListButton).toBeDisabled();
  });

  it('enables the save button if only title is provided', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListModal();
    await openDialog(user);
    await inputCodeListTitle(user);
    const saveCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.save_new_code_list'),
    });
    expect(saveCodeListButton).toBeEnabled();
  });

  it('keeps disabling the save button if only code list content is provided', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListModal();
    await openDialog(user);
    await addCodeListItem(user);
    const saveCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.save_new_code_list'),
    });
    expect(saveCodeListButton).toBeDisabled();
  });

  it('renders error message if code list title is occupied', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListModal();
    await openDialog(user);
    await inputCodeListTitle(user, existingCodeListTitle);
    const codeListTitleError = screen.getByText(textMock('validation_errors.file_name_occupied'));
    expect(codeListTitleError).toBeInTheDocument();
  });

  it('renders error message if code list title does not match regex', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListModal();
    await openDialog(user);
    await inputCodeListTitle(user, 'æ');
    const codeListTitleError = screen.getByText(textMock('validation_errors.name_invalid'));
    expect(codeListTitleError).toBeInTheDocument();
  });

  it('disables the save button if code list title is invalid', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListModal();
    await openDialog(user);
    await inputCodeListTitle(user, existingCodeListTitle);
    const saveCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.save_new_code_list'),
    });
    expect(saveCodeListButton).toBeDisabled();
  });

  it('disables the save button if code list content is invalid', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListModal();
    await openDialog(user);
    await addDuplicatedCodeListValues(user);
    const saveCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.save_new_code_list'),
    });
    expect(saveCodeListButton).toBeDisabled();
  });

  it('enables the save button when valid title and valid code list content are provided', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListModal();
    await openDialog(user);
    await inputCodeListTitle(user);
    await addCodeListItem(user);
    const saveCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.save_new_code_list'),
    });
    expect(saveCodeListButton).toBeEnabled();
  });

  it('calls onUpdateCodeList and closes modal when save button is clicked', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListModal();
    await openDialog(user);
    await inputCodeListTitle(user);
    await addCodeListItem(user);
    const saveCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.save_new_code_list'),
    });
    await user.click(saveCodeListButton);
    expect(onUpdateCodeListMock).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeListMock).toHaveBeenCalledWith({
      codeList: [{ label: '', value: '' }],
      title: newCodeListTitleMock,
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

const openDialog = async (user: UserEvent) => {
  const createNewButton = screen.getByRole('button', {
    name: textMock('app_content_library.code_lists.create_new_code_list'),
  });
  await user.click(createNewButton);
};

const inputCodeListTitle = async (
  user: UserEvent,
  codeListTitle: string = newCodeListTitleMock,
) => {
  const codeListNameInput = screen.getByRole('textbox', {
    name: textMock('app_content_library.code_lists.create_new_code_list_name'),
  });
  await user.type(codeListNameInput, codeListTitle);
};

const addCodeListItem = async (user: UserEvent) => {
  const addCodeListItemButton = screen.getByRole('button', {
    name: textMock('code_list_editor.add_option'),
  });
  await user.click(addCodeListItemButton);
};

const addDuplicatedCodeListValues = async (user: UserEvent) => {
  await addCodeListItem(user);
  await addCodeListItem(user);
};

const renderCreateNewCodeListModal = () => {
  render(
    <CreateNewCodeListModal
      onUpdateCodeList={onUpdateCodeListMock}
      codeListNames={[existingCodeListTitle]}
    />,
  );
};
