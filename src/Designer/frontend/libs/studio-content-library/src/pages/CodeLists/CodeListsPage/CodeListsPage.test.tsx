import { render, screen, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { CodeListsPage } from './CodeListsPage';
import type { CodeListsPageProps } from './CodeListsPage';
import React from 'react';
import { userEvent } from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { codeLists, coloursData } from './test-data/codeLists';

// Test data:
const onSave = jest.fn();
const defaultProps: CodeListsPageProps = { codeLists, onSave };

describe('CodeListsPage', () => {
  beforeEach(onSave.mockClear);

  it('Renders with the given code lists', () => {
    renderCodeListPage();
    codeLists.forEach((codeList) => {
      expect(getCodeListHeading(codeList.name)).toBeInTheDocument();
    });
  });

  it('Adds a new code list when the add button is clicked', async () => {
    const user = userEvent.setup();
    renderCodeListPage();
    await addNewCodeList(user);
    const nameOfNewList = textMock('app_content_library.code_lists.unnamed');
    expect(getCodeListHeading(nameOfNewList)).toBeInTheDocument();
  });

  it('Rerenders with updated data when something is changed', async () => {
    const user = userEvent.setup();
    const newName = 'New code list name';
    renderCodeListPage();
    await addNewCodeList(user);

    const nameInput = getNameField(textMock('app_content_library.code_lists.unnamed'));
    await user.type(nameInput, newName);

    expect(getCodeListHeading(newName)).toBeInTheDocument();
  });

  it('Deletes the code list when the delete button is clicked', async () => {
    const user = userEvent.setup();
    renderCodeListPage();
    await addNewCodeList(user);
    const nameOfNewList = textMock('app_content_library.code_lists.unnamed');
    const details = getCodeListDetails(nameOfNewList);
    const deleteButton = within(details).getByRole('button', { name: textMock('general.delete') });
    await user.click(deleteButton);
    expect(queryCodeListHeading(nameOfNewList)).not.toBeInTheDocument();
  });

  it('Displays a placeholder when the list of code lists is empty', () => {
    renderCodeListPage({ codeLists: [] });
    const placeholderText = textMock('app_content_library.code_lists.empty');
    expect(screen.getByText(placeholderText)).toBeInTheDocument();
  });

  it('Calls the onSave callback with the updated code lists when the save button is clicked', async () => {
    const user = userEvent.setup();
    renderCodeListPage();

    const nameField = getNameField(coloursData.name);
    const newName = 'a';
    await user.clear(nameField);
    await user.type(nameField, newName);
    await saveCodeLists(user);

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedCodeLists = onSave.mock.calls[0][0];
    expect(savedCodeLists).toHaveLength(codeLists.length);
    expect(savedCodeLists[0].name).toEqual(newName);
  });

  it('Does not call onSave when there are validation errors', async () => {
    const user = userEvent.setup();
    renderCodeListPage();
    await addNewCodeList(user); // The new code list is invalid since it has no name
    await saveCodeLists(user);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Shows validation errors when trying to save invalid data', async () => {
    const user = userEvent.setup();
    renderCodeListPage();
    await addNewCodeList(user);
    await saveCodeLists(user);
    const expectedMessage = textMock('app_content_library.code_lists.error.missing_name');
    expect(screen.getByText(expectedMessage)).toBeInTheDocument();
  });
});

function renderCodeListPage(props?: Partial<CodeListsPageProps>): RenderResult {
  return render(<CodeListsPage {...defaultProps} {...props} />);
}

const addNewCodeList = async (user: UserEvent): Promise<void> =>
  user.click(screen.getByRole('button', { name: textMock('general.add') }));

const saveCodeLists = async (user: UserEvent): Promise<void> =>
  user.click(screen.getByRole('button', { name: textMock('general.save') }));

function getNameField(name: string): HTMLElement {
  const details = getCodeListDetails(name);
  const nameLabel = textMock('app_content_library.code_lists.name');
  return within(details).getByRole('textbox', { name: nameLabel });
}

function getCodeListDetails(name: string): HTMLElement {
  // The following code accesses a node directly with parentElement. This is not recommended, hence the Eslint rule, but there is no other way to access the details element.
  // Todo: Use getByRole('group') when the role becomes correctly assigned to the component: https://github.com/digdir/designsystemet/issues/3941
  const { parentElement } = getCodeListHeading(name); // eslint-disable-line testing-library/no-node-access
  /* istanbul ignore else */
  if (parentElement) return parentElement;
  else throw new Error('Could not find code list details element.');
}

const getCodeListHeading = (name: string): HTMLElement => screen.getByRole('button', { name });

const queryCodeListHeading = (name: string): HTMLElement | null =>
  screen.queryByRole('button', { name });
