import type { RenderResult } from '@testing-library/react';
import { render, screen, within } from '@testing-library/react';
import type { StudioCodeListEditorProps } from './StudioCodeListEditor';
import { StudioCodeListEditor } from './StudioCodeListEditor';
import type { CodeList } from './types/CodeList';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import { texts } from './test-data/texts';
import { codeList } from './test-data/codeList';
import { CodeListItemTextProperty } from './enums/CodeListItemTextProperty';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { studioTest } from '@studio/ui-test';

// Test data:
const onInvalid = jest.fn();
const onUpdateCodeList = jest.fn();
const fallbackLanguage = 'nb';
const defaultProps: StudioCodeListEditorProps = {
  codeList,
  fallbackLanguage,
  texts,
  onInvalid,
  onUpdateCodeList,
};
const duplicatedValue = 'duplicate';
const codeListWithDuplicatedValues: CodeList = [
  {
    label: { nb: 'Test 1' },
    value: duplicatedValue,
  },
  {
    label: { nb: 'Test 2' },
    value: duplicatedValue,
  },
  {
    label: { nb: 'Test 3' },
    value: 'unique',
  },
];

const numberOfHeadingRows = 1;

describe('StudioCodeListEditor', () => {
  afterEach(jest.clearAllMocks);

  it('Renders a group element with the given title', () => {
    renderCodeListEditor();
    expect(screen.getByRole('group', { name: texts.codeList })).toBeInTheDocument();
  });

  it('Renders a table of code list items', () => {
    renderCodeListEditor();
    expect(screen.getByRole('table')).toBeInTheDocument();
    const numberOfCodeListItems = codeList.length;
    const expectedNumberOfRows = numberOfCodeListItems + numberOfHeadingRows;
    expect(screen.getAllByRole('row')).toHaveLength(expectedNumberOfRows);
  });

  it('Renders the given column headers', () => {
    renderCodeListEditor();
    expect(screen.getByRole('columnheader', { name: texts.value })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: texts.label })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: texts.description })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: texts.helpText })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: texts.delete })).toBeInTheDocument();
  });

  it('Renders a button to add a new code list item', () => {
    renderCodeListEditor();
    expect(screen.getByRole('button', { name: texts.add })).toBeInTheDocument();
  });

  describe('onUpdateCodeList', () => {
    it('Calls the onUpdateCodeList callback with the new code list when a value field is changed', async () => {
      const user = userEvent.setup();
      renderCodeListEditor();
      const testRowNumber = 1;
      const newValue = 'new text';

      await user.type(
        screen.getByRole('textbox', { name: texts.itemValue(testRowNumber) }),
        newValue,
      );
      await user.tab();

      expect(onUpdateCodeList).toHaveBeenCalledTimes(newValue.length);
      expect(onUpdateCodeList).toHaveBeenLastCalledWith(
        expect.arrayContaining([expect.objectContaining({ value: newValue })]),
      );
    });

    it.each(Object.values(CodeListItemTextProperty))(
      'Calls the onUpdateCodeList callback with the new code list when a %s is changed',
      async (property: CodeListItemTextProperty) => {
        const user = userEvent.setup();
        const propertyCoords: TextPropertyCoords = [1, property];
        const newText = 'Lorem ipsum';

        renderCodeListEditor();
        await user.type(getTextInput(propertyCoords), newText);

        expect(onUpdateCodeList).toHaveBeenLastCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              [property]: expect.objectContaining({ en: newText }),
            }),
          ]),
        );
      },
    );
  });

  it('Calls the onUpdateCodeList callback with the new code list when an item is removed', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const deleteButton = screen.getByRole('button', { name: texts.deleteItem(1) });
    await user.click(deleteButton);
    expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeList).toHaveBeenCalledWith([codeList[1], codeList[2]]);
  });

  it('Calls the onUpdateCodeList callback with the new code list when an item is added', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const addButton = screen.getByRole('button', { name: texts.add });
    await user.click(addButton);
    expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeList).toHaveBeenCalledWith([
      ...codeList,
      expect.objectContaining({ value: '' }),
    ]);
  });

  it('Focuses on the new code field when an item is added', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const addButton = screen.getByRole('button', { name: texts.add });
    await user.click(addButton);
    const updatedCodeList = onUpdateCodeList.mock.calls[0][0] as CodeList;
    const updatedNumberOfItems = updatedCodeList.length;
    const lastCodeInputName = texts.itemValue(updatedNumberOfItems);
    const lastCodeInput = screen.getByRole('textbox', { name: lastCodeInputName });
    expect(lastCodeInput).toHaveFocus();
  });

  it('Updates itself when the user changes something', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const numberOfCodeListItems = codeList.length;
    const expectedNumberOfRows = numberOfCodeListItems + numberOfHeadingRows;
    const addButton = screen.getByRole('button', { name: texts.add });
    await user.click(addButton);
    expect(screen.getAllByRole('row')).toHaveLength(expectedNumberOfRows + 1);
  });

  it('Rerenders with the new code list when the code list prop changes', () => {
    const newCodeList = [
      {
        label: { nb: 'Ny test 1' },
        value: 'newTest1',
      },
      {
        label: { nb: 'Ny test 2' },
        value: 'newTest2',
      },
    ];

    const { rerender } = renderCodeListEditor();

    const numberOfCodeListItems = codeList.length;
    const expectedNumberOfRows = numberOfCodeListItems + numberOfHeadingRows;
    expect(screen.getAllByRole('row')).toHaveLength(expectedNumberOfRows);

    rerender(<StudioCodeListEditor {...defaultProps} codeList={newCodeList} />);

    const newNumberOfCodeListItems = newCodeList.length;
    const newExpectedNumberOfRows = newNumberOfCodeListItems + numberOfHeadingRows;
    expect(screen.getAllByRole('row')).toHaveLength(newExpectedNumberOfRows);
  });

  describe('Invalid code list handling', () => {
    it('Applies custom error message to duplicated values', () => {
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      const firstDuplicateInput = screen.getByRole('textbox', { name: texts.itemValue(1) });
      const secondDuplicateInput = screen.getByRole('textbox', { name: texts.itemValue(2) });
      expect((firstDuplicateInput as HTMLInputElement).validity.customError).toBe(true);
      expect((secondDuplicateInput as HTMLInputElement).validity.customError).toBe(true);
    });

    it('Does not apply custom error message to unique values when other values are duplicated', () => {
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      const uniqueValueInput = screen.getByRole('textbox', { name: texts.itemValue(3) });
      expect((uniqueValueInput as HTMLInputElement).validity.customError).toBe(false);
    });

    it('Renders a general error message when there are errors', () => {
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      expect(screen.getByText(texts.generalError)).toBeInTheDocument();
    });

    it('Does not render the error message when the code list is valid', () => {
      renderCodeListEditor();
      expect(screen.queryByText(texts.generalError)).not.toBeInTheDocument();
    });

    it('Does not trigger onUpdateCodeList while the code list is invalid', async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      const addButton = screen.getByRole('button', { name: texts.add });
      await user.click(addButton);
      expect(onUpdateCodeList).not.toHaveBeenCalled();
    });

    it('Triggers onInvalid when the user changes something and the code list is invalid', async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      const validValueInput = screen.getByRole('textbox', { name: texts.itemValue(3) });
      const newValue = 'new value';
      await user.type(validValueInput, newValue);
      expect(onInvalid).toHaveBeenCalledTimes(newValue.length);
    });

    it('Does not trigger onInvalid when an invalid code list is changed to a valid state', async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      const invalidValueInput = screen.getByRole('textbox', { name: texts.itemValue(2) });
      await user.type(invalidValueInput, 'new unique value');
      expect(onInvalid).not.toHaveBeenCalled();
    });
  });

  it('Renders without errors when no callbacks are provided and the user changes something', async () => {
    const user = userEvent.setup();
    renderCodeListEditor({
      onUpdateCodeList: undefined,
      onInvalid: undefined,
    });
    const labelInput = screen.getByRole('textbox', { name: texts.itemLabel(1) });
    const newValue = 'new text';
    await user.type(labelInput, newValue);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('Renders the empty text when the code list is empty', () => {
    renderCodeListEditor({ codeList: [] });
    expect(screen.getByText(texts.emptyCodeList)).toBeInTheDocument();
  });

  it('Appends the class to the root element when given', () => {
    testRootClassNameAppending((className) => renderCodeListEditor({ className }));
  });

  it('Renders the language picker', () => {
    renderCodeListEditor();
    expect(getLanguagePicker()).toBeInTheDocument();
  });

  it('Renders an option for each given language', () => {
    renderCodeListEditor();
    expect(getLanguageOption('en')).toBeInTheDocument();
    expect(getLanguageOption('nb')).toBeInTheDocument();
    expect(getLanguageOption('nn')).toBeInTheDocument();
  });

  it('Displays the code list in the selected language', async () => {
    const user = setupUser();
    const firstLanguageToSelect = 'nb';
    const secondLanguageToSelect = 'en';
    renderCodeListEditor();
    await user.selectLanguage(firstLanguageToSelect);
    expect(getTextInput([1, CodeListItemTextProperty.Label])).toHaveValue(
      codeList[0].label![firstLanguageToSelect],
    );
    await user.selectLanguage(secondLanguageToSelect);
    expect(getTextInput([1, CodeListItemTextProperty.Label])).toHaveValue(
      codeList[0].label![secondLanguageToSelect],
    );
  });

  it('Calls onChangeCodeList with the new language when the user adds a language', async () => {
    const user = setupUser();
    const newLanguageCode = 'fr';
    renderCodeListEditor();

    await user.addLanguage(newLanguageCode);

    expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeList).toHaveBeenCalledWith(
      expect.arrayContaining([
        {
          ...codeList[0],
          label: {
            ...codeList[0].label,
            [newLanguageCode]: '',
          },
        },
      ]),
    );
  });

  it('Adds the new language as an option when the user adds a language', async () => {
    const user = setupUser();
    const newLanguageCode = 'fr';
    renderCodeListEditor();
    await user.addLanguage(newLanguageCode);
    expect(getLanguageOption(newLanguageCode)).toBeInTheDocument();
  });

  it('Calls onChangeCodeList without the removed language when the user removes a language', async () => {
    const user = setupUser();
    const languageToRemove = 'en';
    renderCodeListEditor();

    await user.removeLanguage(languageToRemove);

    expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
    const updatedCodeList = onUpdateCodeList.mock.calls[0][0] as CodeList;
    expect(Object.keys(updatedCodeList[0].label!)).not.toContain(languageToRemove);
  });

  it('Removes the removed language from the options when the user removes a language', async () => {
    const user = setupUser();
    const languageToRemove = 'en';
    renderCodeListEditor();
    await user.removeLanguage(languageToRemove);
    expect(queryLanguageOption(languageToRemove)).not.toBeInTheDocument();
  });

  it('Allows adding a language when the code list is empty', async () => {
    const user = setupUser();
    const languageToAdd = 'nb';
    renderCodeListEditor({ codeList: [] });
    await user.addLanguage(languageToAdd);
    expect(getLanguageOption(languageToAdd)).toBeInTheDocument();
  });

  it('Selects the fallback language when there are no texts in the code list', () => {
    renderCodeListEditor({ codeList: [{ value: 'test', label: {} }] });
    expect(getLanguagePicker()).toHaveValue(fallbackLanguage);
  });
});

function renderCodeListEditor(props: Partial<StudioCodeListEditorProps> = {}): RenderResult {
  return render(<StudioCodeListEditor {...defaultProps} {...props} />);
}

interface ExtendedUserEvent extends UserEvent {
  selectLanguage(languageCode: string): Promise<void>;
  addLanguage(languageCode: string): Promise<void>;
  removeLanguage(languageCode: string): Promise<void>;
}

function setupUser(): ExtendedUserEvent {
  return {
    ...userEvent.setup(),
    async selectLanguage(languageCode: string): Promise<void> {
      await this.selectOptions(getLanguagePicker(), getLanguageOption(languageCode));
    },
    async addLanguage(languageCode: string): Promise<void> {
      await this.click(getAddLanguageButton());
      await this.type(getAddLanguageInput(), languageCode);
      await this.click(getAddLanguageButton());
    },
    async removeLanguage(languageCode: string): Promise<void> {
      await this.selectLanguage(languageCode);
      studioTest.mockNextConfirmDialog(true);
      await this.click(getRemoveLanguageButton());
    },
  };
}

type TextPropertyCoords = [number, CodeListItemTextProperty];

function getTextInput(textPropertyCoords: TextPropertyCoords): HTMLElement {
  const name = textInputName(textPropertyCoords);
  return screen.getByRole('textbox', { name });
}

function textInputName([itemNumber, property]: TextPropertyCoords): string {
  const propertyKey = textInputNameKey(property);
  return texts[propertyKey](itemNumber);
}

function textInputNameKey<P extends CodeListItemTextProperty>(property: P): `item${Capitalize<P>}` {
  const keyMap: { [Key in CodeListItemTextProperty]: `item${Capitalize<Key>}` } = {
    [CodeListItemTextProperty.Label]: 'itemLabel',
    [CodeListItemTextProperty.Description]: 'itemDescription',
    [CodeListItemTextProperty.HelpText]: 'itemHelpText',
  };
  return keyMap[property];
}

const getLanguagePicker = (): HTMLElement =>
  screen.getByRole('combobox', { name: texts.languagePickerTexts.label });

const getLanguageOption = (name: string): HTMLElement =>
  within(getLanguagePicker()).getByRole('option', { name });

const queryLanguageOption = (name: string): HTMLElement | null =>
  within(getLanguagePicker()).queryByRole('option', { name });

const getAddLanguageButton = (): HTMLElement =>
  screen.getByRole('button', { name: texts.languagePickerTexts.add });

const getAddLanguageInput = (): HTMLElement =>
  screen.getByRole('textbox', { name: texts.languagePickerTexts.newLanguageCode });

const getRemoveLanguageButton = (): HTMLElement =>
  screen.getByRole('button', { name: texts.languagePickerTexts.remove });
