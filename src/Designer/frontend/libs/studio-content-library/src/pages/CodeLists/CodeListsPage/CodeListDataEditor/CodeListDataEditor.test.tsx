import { fruitsFile } from '../test-data/codeLists';
import { CodeListDataEditor } from './CodeListDataEditor';
import type { CodeListDataEditorProps } from './CodeListDataEditor';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { userEvent } from '@testing-library/user-event';
import { FileNameUtils, ArrayUtils, ObjectUtils } from '@studio/pure-functions';
import type { CodeList } from '../../../../types/CodeList';
import type { CodeListFileWithProblem, OrdinaryCodeListFile } from '../../../../types/CodeListFile';
import { screen } from '@studio/ui-test';
import { RouterContextProvider } from '../../../../ContentLibrary/RouterContext';
import { PageName } from '../../../../types/PageName';

// Test data:
const currentFile = fruitsFile;
const codeListName = FileNameUtils.removeExtension(currentFile.name);
const extractCodeList = ({ content }: OrdinaryCodeListFile): CodeList => JSON.parse(content);
const onUpdate = jest.fn();
const onDelete = jest.fn();
const onPublish = jest.fn();
const defaultProps: CodeListDataEditorProps = {
  currentFile,
  isPublishing: false,
  onDelete,
  onPublish,
  onUpdate,
  publishedCodeLists: [],
  savedFile: currentFile,
};

describe('CodeListDataEditor', () => {
  beforeEach(jest.clearAllMocks);

  it('Renders the code list editor with given content', () => {
    renderCodeListDataEditor();
    const expectedNumberOfRowsIncludingHeaders = extractCodeList(currentFile).length + 1;
    expect(screen.getAllByRole('row')).toHaveLength(expectedNumberOfRowsIncludingHeaders);
  });

  it('Renders an input field with the given name', () => {
    renderCodeListDataEditor();
    expect(getNameInput()).toHaveValue(codeListName);
  });

  it('Calls onUpdate with updated data when the code list name is changed', async () => {
    const user = userEvent.setup();
    renderCodeListDataEditor();
    const additionalCharacter = 'a';
    const newName = codeListName + additionalCharacter + '.json';
    await user.type(getNameInput(), additionalCharacter);
    expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ name: newName }));
  });

  it('Calls onUpdate with updated data when one of the codes is changed', async () => {
    const user = userEvent.setup();
    renderCodeListDataEditor();
    const newFirstCode = 'a';
    const firstCodeInputLabel = textMock('code_list_editor.value_item', { number: 1 });
    const firstCodeInput = screen.getByRole('textbox', { name: firstCodeInputLabel });
    await user.type(firstCodeInput, newFirstCode);
    const updatedFile = ArrayUtils.last<OrdinaryCodeListFile>(onUpdate!.mock.calls[0]);
    const updatedCodeList = extractCodeList(updatedFile);
    expect(updatedCodeList[0].value).toEqual(newFirstCode);
  });

  it('Calls onDelete when the delete button is clicked', async () => {
    const user = userEvent.setup();
    renderCodeListDataEditor();
    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('Renders with placeholder when name is empty', () => {
    renderCodeListDataEditor({ currentFile: { ...currentFile, name: '.json' } });
    const placeholderText = textMock('app_content_library.code_lists.unnamed');
    expect(screen.getByText(placeholderText)).toBeInTheDocument();
  });

  it('Does not render the placeholder when name is provided', () => {
    renderCodeListDataEditor();
    const placeholderText = textMock('app_content_library.code_lists.unnamed');
    expect(screen.queryByText(placeholderText)).not.toBeInTheDocument();
  });

  it('Calls onPublish with the code list data when the publish button is clicked', async () => {
    const user = userEvent.setup();
    renderCodeListDataEditor();
    const publishButtonName = textMock('app_content_library.code_lists.publish');
    await user.click(screen.getByRole('button', { name: publishButtonName }));
    expect(onPublish).toHaveBeenCalledTimes(1);
    expect(onPublish).toHaveBeenCalledWith({
      name: codeListName,
      codes: extractCodeList(currentFile),
    });
  });

  it('Disables the publish button when no name is given', () => {
    renderCodeListDataEditor({ currentFile: { ...currentFile, name: '.json' } });
    const publishButtonName = textMock('app_content_library.code_lists.publish');
    expect(screen.getByRole('button', { name: publishButtonName })).toBeDisabled();
  });

  it('Displays the correct status message when the code list is not published', () => {
    renderCodeListDataEditor();
    const expectedMessage = textMock('app_content_library.code_lists.unpublished');
    expect(screen.getByText(expectedMessage)).toBeInTheDocument();
  });

  it('Displays a status message containing the version number when the code list is published', () => {
    const publishedCodeLists: string[] = [
      `${codeListName}/_index.json`,
      `${codeListName}/_latest.json`,
      `${codeListName}/1.json`,
    ];
    renderCodeListDataEditor({ publishedCodeLists });
    const expectedMessage = textMock('app_content_library.code_lists.latest_version', {
      version: 1,
    });
    expect(screen.getByText(expectedMessage)).toBeInTheDocument();
  });

  it('Displays the publish button in loading state while isPublishing is true', () => {
    renderCodeListDataEditor({ isPublishing: true });
    const buttonNameWhilePublishing = textMock('app_content_library.code_lists.is_publishing');
    const loadingButton = screen.getByRole('button', { name: buttonNameWhilePublishing });
    expect(loadingButton).toBeInTheDocument();
  });

  it('Does not have any state class by default', () => {
    renderCodeListDataEditor();
    const summary = screen.getSummaryByText(codeListName);
    expect(summary).not.toHaveClass('added');
    expect(summary).not.toHaveClass('changed');
  });

  it('Has the "changed" state class when saved file is different from current file', () => {
    const savedFile: OrdinaryCodeListFile = {
      ...ObjectUtils.deepCopy(currentFile),
      name: 'something-else',
    };
    renderCodeListDataEditor({ currentFile, savedFile });
    const summary = screen.getSummaryByText(codeListName);
    expect(summary).toHaveClass('changed');
  });

  it('Has the "added" state class when no saved file exists', () => {
    renderCodeListDataEditor({ savedFile: null });
    const summary = screen.getSummaryByText(codeListName);
    expect(summary).toHaveClass('added');
  });

  it('Displays an error message when the file could not be loaded because of backend errors', () => {
    const fileWithProblem: CodeListFileWithProblem = { name: 'fail.json', problem: {} };
    renderCodeListDataEditor({ currentFile: fileWithProblem });
    const expectedMessage = textMock('app_content_library.code_lists.backend_error');
    expect(screen.getByText(expectedMessage)).toBeInTheDocument();
  });

  it('Displays the correct error message when there is a JSON syntax error in the code list file', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const fileWithInvalidJson: OrdinaryCodeListFile = { name: 'invalid.json', content: '{' };

      renderCodeListDataEditor({ currentFile: fileWithInvalidJson });

      const expectedMessageCode = 'app_content_library.code_lists.parse_error.invalid_json_syntax';
      expect(screen.getByText(textMock(expectedMessageCode))).toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('Displays the correct error message when the code list file has valid syntax, but is not correctly structured', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const invalidCodeListJson = '{ "Hello": "I am not a code list" }';
      const invalidFile: OrdinaryCodeListFile = {
        name: 'invalid.json',
        content: invalidCodeListJson,
      };

      renderCodeListDataEditor({ currentFile: invalidFile });

      const expectedMessageCode = 'app_content_library.code_lists.parse_error.invalid_code_list';
      expect(screen.getByText(textMock(expectedMessageCode))).toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });
});

function renderCodeListDataEditor(props: Partial<CodeListDataEditorProps> = {}): RenderResult {
  return render(<CodeListDataEditor {...defaultProps} {...props} />, {
    wrapper: (p) => (
      <RouterContextProvider
        value={{
          location: PageName.LandingPage,
          navigate: jest.fn(),
          renderLink: jest.fn(),
          contactPagePath: '/contact/',
        }}
        {...p}
      />
    ),
  });
}

function getNameInput(): HTMLElement {
  const nameInputLabel = textMock('app_content_library.code_lists.name');
  return screen.getByRole('textbox', { name: nameInputLabel });
}
