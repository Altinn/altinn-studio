import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen, waitFor } from '@testing-library/react';
import type { StudioCodeListEditorProps } from './StudioCodeListEditor';
import { StudioCodeListEditor } from './StudioCodeListEditor';
import type { CodeList } from './types/CodeList';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import { texts } from './test-data/texts';
import { codeListWithStrings } from './test-data/codeListWithStrings';
import { CodeListItemTextProperty } from './types/CodeListItemTextProperty';
import {
  description4Resource,
  helpText4Resource,
  label4Resource,
  textResources,
} from './test-data/textResources';
import type { TextResource } from '../../types/TextResource';
import { codeListWithNumbers } from './test-data/codeListWithNumbers';
import { codeListWithBooleans } from './test-data/codeListWithBooleans';
import { codeListWithMultipleTypes } from './test-data/codeListWithMultipleTypes';
import { codeListWithUndefinedValues } from './test-data/codeListWithUndefinedValues';
import { emptyBooleanItem, emptyNumberItem, emptyStringItem } from './utils';
import { codeListWithoutTextResources } from './test-data/codeListWithoutTextResources';

// Test data:
const onCreateTextResource = jest.fn();
const onInvalid = jest.fn();
const onUpdateCodeList = jest.fn();
const onUpdateTextResource = jest.fn();
const defaultProps: StudioCodeListEditorProps = {
  codeList: codeListWithStrings,
  texts,
  onCreateTextResource,
  onInvalid,
  onUpdateCodeList,
  onUpdateTextResource,
  textResources,
};
const duplicatedValue = 'duplicate';
const codeListWithDuplicatedValues: CodeList = [
  {
    label: 'Test 1',
    value: duplicatedValue,
    description: 'Test 1 description',
    helpText: 'Test 1 help text',
  },
  {
    label: 'Test 2',
    value: duplicatedValue,
    description: 'Test 2 description',
    helpText: 'Test 2 help text',
  },
  {
    label: 'Test 3',
    value: 'unique',
    description: 'Test 3 description',
    helpText: 'Test 3 help text',
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
    const numberOfCodeListItems = codeListWithStrings.length;
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

  describe('Add button', () => {
    it('Renders a button to add a new code list item', () => {
      renderCodeListEditor();
      expect(screen.getByRole('button', { name: texts.add })).toBeInTheDocument();
    });

    it('Disables add button when a code list has two or more boolean items', () => {
      renderCodeListEditor({ codeList: codeListWithBooleans });
      expect(screen.getByTitle(texts.disabledAddButtonTooltip)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: texts.add })).toBeDisabled();
    });
  });

  it('Does not display the unset option for labels', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const firstLabelCoords: TextPropertyCoords = [1, CodeListItemTextProperty.Label];
    await switchToSearchMode(user, firstLabelCoords);
    await user.click(getTextResourcePicker(firstLabelCoords));
    const { noTextResourceOptionLabel } = texts.textResourceTexts(...firstLabelCoords);
    const noTextResourceOption = screen.queryByRole('option', { name: noTextResourceOptionLabel });
    expect(noTextResourceOption).not.toBeInTheDocument();
  });

  it.each([CodeListItemTextProperty.Description, CodeListItemTextProperty.HelpText])(
    `Displays the unset option for %ss`,
    async (property) => {
      const user = userEvent.setup();
      renderCodeListEditor();
      const propertyCoords: TextPropertyCoords = [1, property];
      await switchToSearchMode(user, propertyCoords);
      await user.click(getTextResourcePicker(propertyCoords));
      const { noTextResourceOptionLabel } = texts.textResourceTexts(...propertyCoords);
      const noTextResourceOption = screen.getByRole('option', { name: noTextResourceOptionLabel });
      expect(noTextResourceOption).toBeInTheDocument();
    },
  );

  describe('onCreateTextResource', () => {
    const testRowNumber = 1;
    const newValue = 'new text';

    it.each(Object.values(CodeListItemTextProperty))(
      'Calls the onCreateTextResource callback with the new text resource when a %s field loses focus and there is no text resource linked to it',
      async (property: CodeListItemTextProperty) => {
        const user = userEvent.setup();
        renderCodeListEditor({ codeList: codeListWithoutTextResources });
        const propertyCoords: TextPropertyCoords = [testRowNumber, property];

        await user.type(getTextResourceValueInput(propertyCoords), newValue);
        await user.tab();

        expect(onCreateTextResource).toHaveBeenCalledTimes(1);
        expect(onCreateTextResource).toHaveBeenCalledWith({
          value: expect.stringContaining(newValue),
          id: expect.any(String),
        });
      },
    );
  });

  describe('onUpdateTextResource', () => {
    const testRowNumber = 1;
    const newValue = 'new text';

    it.each(Object.values(CodeListItemTextProperty))(
      'Calls the onUpdateTextResource callback with the updated text resource when a %s field loses focus',
      async (property: CodeListItemTextProperty) => {
        const user = userEvent.setup();
        renderCodeListEditor();
        const propertyCoords: TextPropertyCoords = [testRowNumber, property];

        await user.type(getTextResourceValueInput(propertyCoords), newValue);
        await user.tab();

        expect(onUpdateTextResource).toHaveBeenCalledTimes(1);
        expect(onUpdateTextResource).toHaveBeenCalledWith({
          id: expect.any(String),
          value: expect.stringContaining(newValue),
        });
      },
    );
  });

  describe('onUpdateCodeList', () => {
    it('Calls the onUpdateCodeList callback with the new code list item when a value field loses focus', async () => {
      const user = userEvent.setup();
      renderCodeListEditor();
      const testRowNumber = 1;
      const newValue = 'new text';
      const expectedCodeList = [...codeListWithStrings];
      expectedCodeList[testRowNumber - 1].value = newValue;

      await user.type(
        screen.getByRole('textbox', { name: texts.itemValue(testRowNumber) }),
        newValue,
      );
      await user.tab();

      expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
      expect(onUpdateCodeList).toHaveBeenCalledWith(expectedCodeList);
    });

    it('Calls the onUpdateCodeList callback with the new code list when a label is changed', async () => {
      const user = userEvent.setup();
      renderCodeListEditor();
      const propertyCoords: TextPropertyCoords = [1, CodeListItemTextProperty.Label];
      await switchToSearchMode(user, propertyCoords);
      await user.click(getTextResourcePicker(propertyCoords));
      await user.click(getTextResourceOption(label4Resource));
      await waitFor(expect(onUpdateCodeList).toHaveBeenCalled);
      expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
      expect(onUpdateCodeList).toHaveBeenLastCalledWith([
        { ...codeListWithStrings[0], label: label4Resource.id },
        codeListWithStrings[1],
        codeListWithStrings[2],
      ]);
    });

    it('Calls the onUpdateCodeList callback with the new code list when a description is changed', async () => {
      const user = userEvent.setup();
      renderCodeListEditor();
      const propertyCoords: TextPropertyCoords = [1, CodeListItemTextProperty.Description];
      await switchToSearchMode(user, propertyCoords);
      await user.click(getTextResourcePicker(propertyCoords));
      await user.click(getTextResourceOption(description4Resource));
      await waitFor(expect(onUpdateCodeList).toHaveBeenCalled);
      expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
      expect(onUpdateCodeList).toHaveBeenLastCalledWith([
        { ...codeListWithStrings[0], description: description4Resource.id },
        codeListWithStrings[1],
        codeListWithStrings[2],
      ]);
    });

    it('Calls the onUpdateCodeList callback with the new code list when a help text is changed', async () => {
      const user = userEvent.setup();
      renderCodeListEditor();
      const propertyCoords: TextPropertyCoords = [1, CodeListItemTextProperty.HelpText];
      await switchToSearchMode(user, propertyCoords);
      await user.click(getTextResourcePicker(propertyCoords));
      await user.click(getTextResourceOption(helpText4Resource));
      await waitFor(expect(onUpdateCodeList).toHaveBeenCalled);
      expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
      expect(onUpdateCodeList).toHaveBeenLastCalledWith([
        { ...codeListWithStrings[0], helpText: helpText4Resource.id },
        codeListWithStrings[1],
        codeListWithStrings[2],
      ]);
    });
  });

  it('Calls the onUpdateCodeList callback with the new code list when an item is removed', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const deleteButton = screen.getByRole('button', { name: texts.deleteItem(1) });
    await user.click(deleteButton);
    expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeList).toHaveBeenCalledWith([codeListWithStrings[1], codeListWithStrings[2]]);
  });

  it('Calls the onUpdateCodeList callback with the new code list when an item is added', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const addButton = screen.getByRole('button', { name: texts.add });
    await user.click(addButton);
    expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeList).toHaveBeenCalledWith([
      ...codeListWithStrings,
      {
        label: '',
        value: '',
      },
    ]);
  });

  it('Calls the onUpdateCodeList callback with the current code list when an item in the table is blurred', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const valueInput = screen.getByRole('textbox', { name: texts.itemValue(1) });
    const newValue = 'new text';
    await user.type(valueInput, newValue);
    await user.tab();
    expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeList).toHaveBeenLastCalledWith([
      { ...codeListWithStrings[0], value: newValue },
      codeListWithStrings[1],
      codeListWithStrings[2],
    ]);
  });

  it('Updates itself when the user changes something', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const numberOfCodeListItems = codeListWithStrings.length;
    const expectedNumberOfRows = numberOfCodeListItems + numberOfHeadingRows;
    const addButton = screen.getByRole('button', { name: texts.add });
    await user.click(addButton);
    expect(screen.getAllByRole('row')).toHaveLength(expectedNumberOfRows + 1);
  });

  it('Rerenders with the new code list when the code list prop changes', () => {
    const newCodeList = [
      {
        label: 'New test 1',
        value: 'newTest1',
        description: 'New test 1 description',
      },
      {
        label: 'New test 2',
        value: 'newTest2',
        description: 'New test 2 description',
      },
    ];
    const { rerender } = renderCodeListEditor();
    const numberOfCodeListItems = codeListWithStrings.length;
    const expectedNumberOfRows = numberOfCodeListItems + numberOfHeadingRows;
    expect(screen.getAllByRole('row')).toHaveLength(expectedNumberOfRows);
    rerender(<StudioCodeListEditor {...defaultProps} codeList={newCodeList} />);
    const newNumberOfCodeListItems = newCodeList.length;
    const newExpectedNumberOfRows = newNumberOfCodeListItems + numberOfHeadingRows;
    expect(screen.getAllByRole('row')).toHaveLength(newExpectedNumberOfRows);
  });

  describe('Invalid code list handling', () => {
    it('Applies invalid state to duplicated values', () => {
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      const firstDuplicateInput = screen.getByRole('textbox', { name: texts.itemValue(1) });
      const secondDuplicateInput = screen.getByRole('textbox', { name: texts.itemValue(2) });
      expect(firstDuplicateInput).toBeInvalid();
      expect(secondDuplicateInput).toBeInvalid();
    });

    it('Does not apply invalid state to unique values when other values are duplicated', () => {
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      const uniqueValueInput = screen.getByRole('textbox', { name: texts.itemValue(3) });
      expect(uniqueValueInput).toBeValid();
    });

    it('Applies invalid state to undefined values', () => {
      renderCodeListEditor({ codeList: codeListWithUndefinedValues });
      const firstInput = screen.getByRole('textbox', { name: texts.itemValue(1) });
      const secondInput = screen.getByRole('textbox', { name: texts.itemValue(2) });
      const thirdInput = screen.getByRole('textbox', { name: texts.itemValue(3) });
      expect(firstInput).toBeInvalid();
      expect(secondInput).toBeInvalid();
      expect(thirdInput).toBeInvalid();
    });

    it('Applies invalid state to every value when there are multiple types', () => {
      renderCodeListEditor({ codeList: codeListWithMultipleTypes });
      const firstInput = screen.getByRole('textbox', { name: texts.itemValue(1) });
      const secondInput = screen.getByRole('checkbox', { name: texts.itemValue(2) });
      const thirdInput = screen.getByRole('textbox', { name: texts.itemValue(3) });
      expect(firstInput).toBeInvalid();
      expect(secondInput).toBeInvalid();
      expect(thirdInput).toBeInvalid();
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

    it('Does trigger onInvalid if the code list is invalid', async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      const validValueInput = screen.getByRole('textbox', { name: texts.itemValue(3) });
      const newValue = 'new value';
      await user.type(validValueInput, newValue);
      expect(onInvalid).toHaveBeenCalledTimes(newValue.length);
    });

    it('Does not trigger onInvalid if an invalid code list is changed to a valid state', async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      const invalidValueInput = screen.getByRole('textbox', { name: texts.itemValue(2) });
      await user.type(invalidValueInput, 'new unique value');
      expect(onInvalid).not.toHaveBeenCalled();
    });

    it('Does not trigger onInvalid if the code list is invalid, but onInvalid is not defined', async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues, onInvalid: undefined });
      const validValueInput = screen.getByRole('textbox', { name: texts.itemValue(3) });
      const newValue = 'new value';
      await user.type(validValueInput, newValue);
      expect(onInvalid).not.toHaveBeenCalled();
    });
  });

  it('Renders without errors when changing item and no callbacks are provided', async () => {
    const user = userEvent.setup();
    renderCodeListEditor({
      onCreateTextResource: undefined,
      onUpdateCodeList: undefined,
      onUpdateTextResource: undefined,
      onInvalid: undefined,
    });
    const labelInput = screen.getByRole('textbox', { name: texts.itemLabel(1) });
    const newValue = 'new text';
    await user.type(labelInput, newValue);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('Renders without errors when adding an item and no callbacks are provided', async () => {
    const user = userEvent.setup();
    renderCodeListEditor({
      onCreateTextResource: undefined,
      onUpdateCodeList: undefined,
      onUpdateTextResource: undefined,
      onInvalid: undefined,
    });
    const addButton = screen.getByRole('button', { name: texts.add });
    await user.click(addButton);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('Renders without errors when removing an item and no callbacks are provided', async () => {
    const user = userEvent.setup();
    renderCodeListEditor({
      onCreateTextResource: undefined,
      onUpdateCodeList: undefined,
      onUpdateTextResource: undefined,
      onInvalid: undefined,
    });
    const deleteButton = screen.getByRole('button', { name: texts.deleteItem(1) });
    await user.click(deleteButton);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  describe('Type handling', () => {
    it('Renders type selector when code list is empty', () => {
      renderCodeListEditor({ codeList: [] });
      expect(getTypeSelector()).toBeInTheDocument();
    });

    it('Does not render type selector when code list is already populated', () => {
      renderCodeListEditor();
      const typeSelector = screen.queryByRole('combobox', { name: texts.typeSelectorLabel });
      expect(typeSelector).not.toBeInTheDocument();
    });

    it("Creates an empty string item when string is selected and 'Add new' is pressed", async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: [] });

      const stringOption = screen.getByRole('option', { name: texts.typeSelectorOptions.string });
      await user.selectOptions(getTypeSelector(), stringOption);
      await user.click(getAddButton());

      expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
      expect(onUpdateCodeList).toHaveBeenCalledWith([emptyStringItem]);
    });

    it("Creates an empty number item when number is selected and 'Add new' is pressed", async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: [] });

      const numberOption = screen.getByRole('option', { name: texts.typeSelectorOptions.number });
      await user.selectOptions(getTypeSelector(), numberOption);
      await user.click(getAddButton());

      expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
      expect(onUpdateCodeList).toHaveBeenCalledWith([emptyNumberItem]);
    });

    it("Creates an empty boolean item when boolean is selected and 'Add new' is pressed", async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: [] });

      const booleanOption = screen.getByRole('option', { name: texts.typeSelectorOptions.boolean });
      await user.selectOptions(getTypeSelector(), booleanOption);
      await user.click(getAddButton());

      expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
      expect(onUpdateCodeList).toHaveBeenCalledWith([emptyBooleanItem]);
    });

    it('Creates an empty string item when the last element in code list is a string', async () => {
      const user = userEvent.setup();
      renderCodeListEditor();

      const addButton = screen.getByRole('button', { name: texts.add });
      await user.click(addButton);

      expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
      expect(onUpdateCodeList).toHaveBeenCalledWith([...codeListWithStrings, emptyStringItem]);
    });

    it('Creates an empty number item when the last element in code list is a number', async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: codeListWithNumbers });

      const addButton = screen.getByRole('button', { name: texts.add });
      await user.click(addButton);

      expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
      expect(onUpdateCodeList).toHaveBeenCalledWith([...codeListWithNumbers, emptyNumberItem]);
    });

    it('Creates an empty boolean item when the last element in code list is a boolean', async () => {
      const user = userEvent.setup();
      const codeListWithTrueValue = [{ label: 'test', value: true }];
      renderCodeListEditor({ codeList: codeListWithTrueValue });

      const addButton = screen.getByRole('button', { name: texts.add });
      await user.click(addButton);

      expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
      expect(onUpdateCodeList).toHaveBeenCalledWith([...codeListWithTrueValue, emptyBooleanItem]);
    });

    it('Renders textfield when item value is a string', () => {
      renderCodeListEditor();
      const textfield = screen.getByRole('textbox', { name: texts.itemValue(1) });
      expect(textfield).not.toHaveProperty('inputMode', 'decimal');
    });

    it('Renders numberfield when item value is a number', () => {
      renderCodeListEditor({ codeList: codeListWithNumbers });
      const numberfield = screen.getByRole('textbox', { name: texts.itemValue(1) });
      expect(numberfield).toHaveProperty('inputMode', 'decimal');
    });

    it('Renders numberfield when item value is null', () => {
      renderCodeListEditor({ codeList: [{ value: null, label: 'test-label' }] });
      const numberfield = screen.getByRole('textbox', { name: texts.itemValue(1) });
      expect(numberfield).toHaveProperty('inputMode', 'decimal');
    });

    it('Renders checkbox when item value is a boolean', () => {
      renderCodeListEditor({ codeList: codeListWithBooleans });
      expect(screen.getByRole('checkbox', { name: texts.itemValue(1) })).toBeInTheDocument();
    });

    it('Saves changed item value as string when initial value was a string', async () => {
      const user = userEvent.setup();
      renderCodeListEditor();

      const valueInput = screen.getByRole('textbox', { name: texts.itemValue(1) });
      const changedValue = 'new text';
      await user.type(valueInput, changedValue);
      await user.tab();

      expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
      expect(onUpdateCodeList).toHaveBeenCalledWith([
        { ...codeListWithStrings[0], value: changedValue },
        codeListWithStrings[1],
        codeListWithStrings[2],
      ]);
    });

    it('Saves changed item value as number when initial value was a number', async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: codeListWithNumbers });

      const valueInput = screen.getByRole('textbox', { name: texts.itemValue(1) });
      await user.type(valueInput, '10');
      await user.tab();

      expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
      expect(onUpdateCodeList).toHaveBeenCalledWith([
        { ...codeListWithNumbers[0], value: 10 },
        codeListWithNumbers[1],
        codeListWithNumbers[2],
      ]);
    });

    it('Numberfield does not update code list when given a string value', async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: codeListWithNumbers });

      const valueInput = screen.getByRole('textbox', { name: texts.itemValue(1) });
      await user.type(valueInput, 'not-a-number');
      await user.tab();

      expect(onUpdateCodeList).not.toHaveBeenCalled();
    });

    it('Saves changed item value as boolean when initial value was a boolean', async () => {
      const user = userEvent.setup();
      const codeListWithSingleBooleanValue: CodeList = [codeListWithBooleans[0]];
      renderCodeListEditor({ codeList: codeListWithSingleBooleanValue });

      const valueInput = screen.getByRole('checkbox', { name: texts.itemValue(1) });
      await user.click(valueInput);

      expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
      expect(onUpdateCodeList).toHaveBeenCalledWith([{ ...codeListWithBooleans[0], value: false }]);
    });
  });
});

function renderCodeListEditor(props: Partial<StudioCodeListEditorProps> = {}): RenderResult {
  return render(<StudioCodeListEditor {...defaultProps} {...props} />);
}

async function switchToSearchMode(
  user: UserEvent,
  textPropertyCoords: TextPropertyCoords,
): Promise<void> {
  const name = texts.textResourceTexts(...textPropertyCoords).search;
  const searchModeButton = screen.getByRole('radio', { name });
  await user.click(searchModeButton);
}

type TextPropertyCoords = [number, CodeListItemTextProperty];

function getTextResourcePicker(textPropertyCoords: TextPropertyCoords): HTMLElement {
  const name = texts.textResourceTexts(...textPropertyCoords).textResourcePickerLabel;
  return screen.getByRole('combobox', { name });
}

function getTextResourceValueInput(textPropertyCoords: TextPropertyCoords): HTMLElement {
  const name = texts.textResourceTexts(...textPropertyCoords).valueLabel;
  return screen.getByRole('textbox', { name });
}

function getTextResourceOption(textResource: TextResource): HTMLElement {
  const name = retrieveTextResourceOptionName(textResource);
  return screen.getByRole('option', { name });
}

function retrieveTextResourceOptionName(textResource: TextResource): string {
  return textResource.value + ' ' + textResource.id;
}

const getTypeSelector = (): HTMLElement =>
  screen.getByRole('combobox', { name: texts.typeSelectorLabel });

const getAddButton = (): HTMLElement => screen.getByRole('button', { name: texts.add });
