import React, { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import { CreateNewCodeListDialog } from './CreateNewCodeListDialog';
import { textMock } from '@studio/testing/mocks/i18nMock';

const onUpdateCodeListMock = jest.fn();
const newCodeListTitleMock = 'newCodeListTitleMock';
const existingCodeListTitle = 'existingCodeListTitle';

describe('CreateNewCodeListDialog', () => {
  afterEach(jest.clearAllMocks);

  it('renders an empty textfield for inputting code list name', async () => {
    renderCreateNewCodeListDialog();
    const codeListNameInput = screen.getByRole('textbox', {
      name: textMock('app_content_library.code_lists.create_new_code_list_name'),
    });
    expect(codeListNameInput).toHaveTextContent('');
  });

  it('renders the code list editor without code list', () => {
    renderCreateNewCodeListDialog();
    const typeSelector = screen.getByRole('combobox', {
      name: textMock('code_list_editor.type_selector_label'),
    });
    expect(typeSelector).toBeInTheDocument();
  });

  it('renders a disabled button by default', () => {
    renderCreateNewCodeListDialog();
    const saveCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.save_new_code_list'),
    });
    expect(saveCodeListButton).toBeDisabled();
  });

  it('enables the save button if only title is provided', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListDialog();
    await inputCodeListTitle(user);
    const saveCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.save_new_code_list'),
    });
    expect(saveCodeListButton).toBeEnabled();
  });

  it('keeps disabling the save button if only code list content is provided', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListDialog();
    await addCodeListItem(user);
    const saveCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.save_new_code_list'),
    });
    expect(saveCodeListButton).toBeDisabled();
  });

  it('renders error message if code list title is occupied', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListDialog();
    await inputCodeListTitle(user, existingCodeListTitle);
    const codeListTitleError = screen.getByText(textMock('validation_errors.file_name_occupied'));
    expect(codeListTitleError).toBeInTheDocument();
  });

  it('renders error message if code list title does not match regex', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListDialog();
    await inputCodeListTitle(user, 'æ');
    const codeListTitleError = screen.getByText(textMock('validation_errors.name_invalid'));
    expect(codeListTitleError).toBeInTheDocument();
  });

  it('disables the save button if code list title is invalid', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListDialog();
    await inputCodeListTitle(user, existingCodeListTitle);
    const saveCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.save_new_code_list'),
    });
    expect(saveCodeListButton).toBeDisabled();
  });

  it('disables the save button if code list content is invalid', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListDialog();
    await addDuplicatedCodeListValues(user);
    const saveCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.save_new_code_list'),
    });
    expect(saveCodeListButton).toBeDisabled();
  });

  it('enables the save button when valid title and valid code list content are provided', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListDialog();
    await inputCodeListTitle(user);
    await addCodeListItem(user);
    const saveCodeListButton = screen.getByRole('button', {
      name: textMock('app_content_library.code_lists.save_new_code_list'),
    });
    expect(saveCodeListButton).toBeEnabled();
  });

  it('calls onUpdateCodeList and closes the dialog when save button is clicked', async () => {
    const user = userEvent.setup();
    renderCreateNewCodeListDialog();
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

const renderCreateNewCodeListDialog = (): RenderResult => {
  const Component = (): ReactElement => {
    const ref = useRef<HTMLDialogElement>(null);

    useShowModal(ref);

    return (
      <CreateNewCodeListDialog
        onUpdateCodeList={onUpdateCodeListMock}
        codeListNames={[existingCodeListTitle]}
        ref={ref}
      />
    );
  };

  return render(<Component />);
};

const useShowModal = (ref: React.RefObject<HTMLDialogElement>) => {
  useEffect(() => {
    ref.current?.showModal();
  }, [ref]);
};
