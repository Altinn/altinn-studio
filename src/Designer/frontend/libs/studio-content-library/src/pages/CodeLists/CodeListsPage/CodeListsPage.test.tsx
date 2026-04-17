import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { CodeListsPage } from './CodeListsPage';
import type { CodeListsPageProps } from './CodeListsPage';
import { userEvent } from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { codeLists, coloursData } from './test-data/codeLists';
import { studioScreen, studioWithin } from '@studio/ui-test';

// Test data:
const onPublish = jest.fn();
const onSave = jest.fn();
const defaultProps: CodeListsPageProps = {
  codeLists,
  isPublishing: jest.fn().mockReturnValue(false),
  onPublish,
  onSave,
  publishedCodeLists: [],
};

describe('CodeListsPage', () => {
  beforeEach(() => {
    onPublish.mockClear();
    onSave.mockClear();
  });

  it('Renders with the given code lists', () => {
    renderCodeListPage();
    codeLists.forEach((codeList) => {
      expect(studioScreen.getDetailsBySummary(codeList.name)).toBeInTheDocument();
    });
  });

  it('Adds a new code list when the add button is clicked', async () => {
    const user = userEvent.setup();
    renderCodeListPage();
    await addNewCodeList(user);
    const nameOfNewList = textMock('app_content_library.code_lists.unnamed');
    expect(studioScreen.getDetailsBySummary(nameOfNewList)).toBeInTheDocument();
  });

  it('Rerenders with updated data when something is changed', async () => {
    const user = userEvent.setup();
    const newName = 'New code list name';
    renderCodeListPage();
    await addNewCodeList(user);

    const nameInput = getNameField(textMock('app_content_library.code_lists.unnamed'));
    await user.type(nameInput, newName);

    expect(studioScreen.getDetailsBySummary(newName)).toBeInTheDocument();
  });

  it('Deletes the code list when the delete button is clicked', async () => {
    const user = userEvent.setup();
    renderCodeListPage();
    await addNewCodeList(user);
    const nameOfNewList = textMock('app_content_library.code_lists.unnamed');
    const details = studioScreen.getDetailsBySummary(nameOfNewList);
    const deleteButtonName = textMock('general.delete');
    await user.click(studioWithin(details).getByRole('button', { name: deleteButtonName }));
    expect(studioScreen.queryDetailsBySummary(nameOfNewList)).not.toBeInTheDocument();
  });

  it('Displays a placeholder when the list of code lists is empty', () => {
    renderCodeListPage({ codeLists: [] });
    const placeholderText = textMock('app_content_library.code_lists.empty');
    expect(studioScreen.getByText(placeholderText)).toBeInTheDocument();
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
    expect(studioScreen.getByText(expectedMessage)).toBeInTheDocument();
  });
});

function renderCodeListPage(props?: Partial<CodeListsPageProps>): RenderResult {
  return render(<CodeListsPage {...defaultProps} {...props} />);
}

const addNewCodeList = async (user: UserEvent): Promise<void> =>
  user.click(studioScreen.getByRole('button', { name: textMock('general.add') }));

const saveCodeLists = async (user: UserEvent): Promise<void> =>
  user.click(studioScreen.getByRole('button', { name: textMock('general.save') }));

function getNameField(name: string): HTMLElement {
  const details = studioScreen.getDetailsBySummary(name);
  const nameLabel = textMock('app_content_library.code_lists.name');
  return studioWithin(details).getByRole('textbox', { name: nameLabel });
}
