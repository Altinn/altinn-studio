import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen, waitFor } from '@testing-library/react';
import type { StudioCodeListEditorProps } from './StudioCodeListEditor';
import { StudioCodeListEditor } from './StudioCodeListEditor';
import type { CodeList } from './types/CodeList';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import { codeListWithoutTextResources } from './test-data/codeListWithoutTextResources';
import { texts } from './test-data/texts';
import { codeListWithTextResources } from './test-data/codeListWithTextResources';
import { CodeListItemTextProperty } from './types/CodeListItemTextProperty';
import {
  description1Resource,
  description4Resource,
  helpText1Resource,
  helpText4Resource,
  label1Resource,
  label4Resource,
  textResources,
} from './test-data/textResources';
import type { TextResource } from '../../types/TextResource';
import { codeListWithNumbers } from './test-data/codeListWithNumbers';
import { codeListWithBooleans } from './test-data/codeListWithBooleans';
import { codeListWithMultipleTypes } from './test-data/codeListWithMultipleTypes';
import { codeListWithUndefinedValues } from './test-data/codeListWithUndefinedValues';
import { emptyBooleanItem, emptyNumberItem, emptyStringItem } from './utils';

// Test data:
const onAddOrDeleteItem = jest.fn();
const onBlurAny = jest.fn();
const onChange = jest.fn();
const onInvalid = jest.fn();
const defaultProps: StudioCodeListEditorProps = {
  codeList: codeListWithoutTextResources,
  texts,
  onAddOrDeleteItem,
  onBlurAny,
  onChange,
  onInvalid,
};
const propsWithTextResources: Partial<StudioCodeListEditorProps> = {
  textResources,
  codeList: codeListWithTextResources,
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
    const numberOfCodeListItems = codeListWithoutTextResources.length;
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

  it('Does not display the unset option for labels', async () => {
    const user = userEvent.setup();
    renderCodeListEditor(propsWithTextResources);
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
      renderCodeListEditor(propsWithTextResources);
      const propertyCoords: TextPropertyCoords = [1, property];
      await switchToSearchMode(user, propertyCoords);
      await user.click(getTextResourcePicker(propertyCoords));
      const { noTextResourceOptionLabel } = texts.textResourceTexts(...propertyCoords);
      const noTextResourceOption = screen.getByRole('option', { name: noTextResourceOptionLabel });
      expect(noTextResourceOption).toBeInTheDocument();
    },
  );

  it('Calls the onChange callback with the new code list when a value is changed', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const valueInput = screen.getByRole('textbox', { name: texts.itemValue(1) });
    const newValue = 'new text';
    await user.type(valueInput, newValue);
    expect(onChange).toHaveBeenCalledTimes(newValue.length);
    expect(onChange).toHaveBeenLastCalledWith([
      { ...codeListWithoutTextResources[0], value: newValue },
      codeListWithoutTextResources[1],
      codeListWithoutTextResources[2],
    ]);
  });

  describe('onChange without text resources', () => {
    it('Calls the onChange callback with the new code list when a label is changed', async () => {
      const user = userEvent.setup();
      renderCodeListEditor();
      const labelInput = screen.getByRole('textbox', { name: texts.itemLabel(1) });
      const newValue = 'new text';
      await user.type(labelInput, newValue);
      expect(onChange).toHaveBeenCalledTimes(newValue.length);
      expect(onChange).toHaveBeenLastCalledWith([
        { ...codeListWithoutTextResources[0], label: newValue },
        codeListWithoutTextResources[1],
        codeListWithoutTextResources[2],
      ]);
    });

    it('Calls the onChange callback with the new code list when a description is changed', async () => {
      const user = userEvent.setup();
      renderCodeListEditor();
      const descriptionInput = screen.getByRole('textbox', { name: texts.itemDescription(1) });
      const newValue = 'new text';
      await user.type(descriptionInput, newValue);
      expect(onChange).toHaveBeenCalledTimes(newValue.length);
      expect(onChange).toHaveBeenLastCalledWith([
        { ...codeListWithoutTextResources[0], description: newValue },
        codeListWithoutTextResources[1],
        codeListWithoutTextResources[2],
      ]);
    });

    it('Calls the onChange callback with the new code list when a help text is changed', async () => {
      const user = userEvent.setup();
      renderCodeListEditor();
      const helpTextInput = screen.getByRole('textbox', { name: texts.itemHelpText(1) });
      const newValue = 'new text';
      await user.type(helpTextInput, newValue);
      expect(onChange).toHaveBeenCalledTimes(newValue.length);
      expect(onChange).toHaveBeenLastCalledWith([
        { ...codeListWithoutTextResources[0], helpText: newValue },
        codeListWithoutTextResources[1],
        codeListWithoutTextResources[2],
      ]);
    });
  });

  describe('onChange with text resources', () => {
    const testRowNumber = 1;

    it('Calls the onChange callback with the new code list when a label is changed', async () => {
      const user = userEvent.setup();
      renderCodeListEditor(propsWithTextResources);
      const propertyCoords: TextPropertyCoords = [testRowNumber, CodeListItemTextProperty.Label];
      await switchToSearchMode(user, propertyCoords);
      await user.click(getTextResourcePicker(propertyCoords));
      await user.click(getTextResourceOption(label4Resource));
      await waitFor(expect(onChange).toHaveBeenCalled);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenLastCalledWith([
        { ...codeListWithTextResources[0], label: label4Resource.id },
        codeListWithTextResources[1],
        codeListWithTextResources[2],
      ]);
    });

    it('Calls the onChange callback with the new code list when a description is changed', async () => {
      const user = userEvent.setup();
      renderCodeListEditor(propsWithTextResources);
      const propertyCoords: TextPropertyCoords = [
        testRowNumber,
        CodeListItemTextProperty.Description,
      ];
      await switchToSearchMode(user, propertyCoords);
      await user.click(getTextResourcePicker(propertyCoords));
      await user.click(getTextResourceOption(description4Resource));
      await waitFor(expect(onChange).toHaveBeenCalled);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenLastCalledWith([
        { ...codeListWithTextResources[0], description: description4Resource.id },
        codeListWithTextResources[1],
        codeListWithTextResources[2],
      ]);
    });

    it('Calls the onChange callback with the new code list when a help text is changed', async () => {
      const user = userEvent.setup();
      renderCodeListEditor(propsWithTextResources);
      const propertyCoords: TextPropertyCoords = [testRowNumber, CodeListItemTextProperty.HelpText];
      await switchToSearchMode(user, propertyCoords);
      await user.click(getTextResourcePicker(propertyCoords));
      await user.click(getTextResourceOption(helpText4Resource));
      await waitFor(expect(onChange).toHaveBeenCalled);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenLastCalledWith([
        { ...codeListWithTextResources[0], helpText: helpText4Resource.id },
        codeListWithTextResources[1],
        codeListWithTextResources[2],
      ]);
    });
  });

  describe('onChangeTextResource', () => {
    const testRowNumber = 1;

    it('Calls the onChangeTextResource callback with the new text resource when a label is changed', async () => {
      const user = userEvent.setup();
      const onChangeTextResource = jest.fn();
      renderCodeListEditor({ ...propsWithTextResources, onChangeTextResource });
      const propertyCoords: TextPropertyCoords = [testRowNumber, CodeListItemTextProperty.Label];
      const newValue = 'new text';
      await user.type(getTextResourceValueInput(propertyCoords), newValue);
      expect(onChangeTextResource).toHaveBeenCalledTimes(newValue.length);
      expect(onChangeTextResource).toHaveBeenLastCalledWith({
        ...label1Resource,
        value: expect.stringContaining(newValue),
      });
    });

    it('Calls the onChangeTextResource callback with the new text resource when a description is changed', async () => {
      const user = userEvent.setup();
      const onChangeTextResource = jest.fn();
      renderCodeListEditor({ ...propsWithTextResources, onChangeTextResource });
      const propertyCoords: TextPropertyCoords = [
        testRowNumber,
        CodeListItemTextProperty.Description,
      ];
      const newValue = 'new text';
      await user.type(getTextResourceValueInput(propertyCoords), newValue);
      expect(onChangeTextResource).toHaveBeenCalledTimes(newValue.length);
      expect(onChangeTextResource).toHaveBeenLastCalledWith({
        ...description1Resource,
        value: expect.stringContaining(newValue),
      });
    });

    it('Calls the onChangeTextResource callback with the new text resource when a help text is changed', async () => {
      const user = userEvent.setup();
      const onChangeTextResource = jest.fn();
      renderCodeListEditor({ ...propsWithTextResources, onChangeTextResource });
      const propertyCoords: TextPropertyCoords = [testRowNumber, CodeListItemTextProperty.HelpText];
      const newValue = 'new text';
      await user.type(getTextResourceValueInput(propertyCoords), newValue);
      expect(onChangeTextResource).toHaveBeenCalledTimes(newValue.length);
      expect(onChangeTextResource).toHaveBeenLastCalledWith({
        ...helpText1Resource,
        value: expect.stringContaining(newValue),
      });
    });
  });

  describe('onBlurTextResource', () => {
    const testRowNumber = 1;

    it('Calls the onBlurTextResource callback with the new text resource when a label is changed', async () => {
      const user = userEvent.setup();
      const onBlurTextResource = jest.fn();
      renderCodeListEditor({ ...propsWithTextResources, onBlurTextResource });
      const propertyCoords: TextPropertyCoords = [testRowNumber, CodeListItemTextProperty.Label];
      const newValue = 'new text';
      await user.type(getTextResourceValueInput(propertyCoords), newValue);
      await user.tab();
      expect(onBlurTextResource).toHaveBeenCalledTimes(1);
      expect(onBlurTextResource).toHaveBeenCalledWith({
        ...label1Resource,
        value: expect.stringContaining(newValue),
      });
    });

    it('Calls the onBlurTextResource callback with the new text resource when a description is changed', async () => {
      const user = userEvent.setup();
      const onBlurTextResource = jest.fn();
      renderCodeListEditor({ ...propsWithTextResources, onBlurTextResource });
      const propertyCoords: TextPropertyCoords = [
        testRowNumber,
        CodeListItemTextProperty.Description,
      ];
      const newValue = 'new text';
      await user.type(getTextResourceValueInput(propertyCoords), newValue);
      await user.tab();
      expect(onBlurTextResource).toHaveBeenCalledTimes(1);
      expect(onBlurTextResource).toHaveBeenCalledWith({
        ...description1Resource,
        value: expect.stringContaining(newValue),
      });
    });

    it('Calls the onBlurTextResource callback with the new text resource when a help text is changed', async () => {
      const user = userEvent.setup();
      const onBlurTextResource = jest.fn();
      renderCodeListEditor({ ...propsWithTextResources, onBlurTextResource });
      const propertyCoords: TextPropertyCoords = [testRowNumber, CodeListItemTextProperty.HelpText];
      const newValue = 'new text';
      await user.type(getTextResourceValueInput(propertyCoords), newValue);
      await user.tab();
      expect(onBlurTextResource).toHaveBeenCalledTimes(1);
      expect(onBlurTextResource).toHaveBeenCalledWith({
        ...helpText1Resource,
        value: expect.stringContaining(newValue),
      });
    });
  });

  it('Calls the onChange callback with the new code list when an item is removed', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const deleteButton = screen.getByRole('button', { name: texts.deleteItem(1) });
    await user.click(deleteButton);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      codeListWithoutTextResources[1],
      codeListWithoutTextResources[2],
    ]);
  });

  it('Calls the onChange callback with the new code list when an item is added', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const addButton = screen.getByRole('button', { name: texts.add });
    await user.click(addButton);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      ...codeListWithoutTextResources,
      {
        label: '',
        value: '',
      },
    ]);
  });

  it('Calls the onBlurAny callback with the current code list when an item in the table is blurred', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const valueInput = screen.getByRole('textbox', { name: texts.itemValue(1) });
    const newValue = 'new text';
    await user.type(valueInput, newValue);
    await user.tab();
    expect(onBlurAny).toHaveBeenCalledTimes(1);
    expect(onBlurAny).toHaveBeenLastCalledWith([
      { ...codeListWithoutTextResources[0], value: newValue },
      codeListWithoutTextResources[1],
      codeListWithoutTextResources[2],
    ]);
  });

  it('Calls the onAddOrDeleteItem callback with the new code list when an item is added', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const addButton = screen.getByRole('button', { name: texts.add });
    await user.click(addButton);
    expect(onAddOrDeleteItem).toHaveBeenCalledTimes(1);
    expect(onAddOrDeleteItem).toHaveBeenCalledWith([
      ...codeListWithoutTextResources,
      {
        label: '',
        value: '',
      },
    ]);
  });

  it('Calls the onAddOrDeleteItem callback with the new code list when an item is removed', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const deleteButton = screen.getByRole('button', { name: texts.deleteItem(1) });
    await user.click(deleteButton);
    expect(onAddOrDeleteItem).toHaveBeenCalledTimes(1);
    expect(onAddOrDeleteItem).toHaveBeenCalledWith([
      codeListWithoutTextResources[1],
      codeListWithoutTextResources[2],
    ]);
  });

  it('Updates itself when the user changes something', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const numberOfCodeListItems = codeListWithoutTextResources.length;
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
    const numberOfCodeListItems = codeListWithoutTextResources.length;
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

    it('Does not trigger onChange while the code list is invalid', async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      const validValueInput = screen.getByRole('textbox', { name: texts.itemValue(3) });
      await user.type(validValueInput, 'new value');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('Does not trigger onBlurAny while the code list is invalid', async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      const validValueInput = screen.getByRole('textbox', { name: texts.itemValue(3) });
      await user.type(validValueInput, 'new value');
      await user.tab();
      expect(onBlurAny).not.toHaveBeenCalled();
    });

    it('Does not trigger onAddOrDeleteItem while the code list is invalid', async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      const addButton = screen.getByRole('button', { name: texts.add });
      await user.click(addButton);
      expect(onAddOrDeleteItem).not.toHaveBeenCalled();
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
      onAddOrDeleteItem: undefined,
      onBlurAny: undefined,
      onChange: undefined,
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
      onAddOrDeleteItem: undefined,
      onBlurAny: undefined,
      onChange: undefined,
      onInvalid: undefined,
    });
    const addButton = screen.getByRole('button', { name: texts.add });
    await user.click(addButton);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('Renders without errors when removing an item and no callbacks are provided', async () => {
    const user = userEvent.setup();
    renderCodeListEditor({
      onAddOrDeleteItem: undefined,
      onBlurAny: undefined,
      onChange: undefined,
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

      expect(onAddOrDeleteItem).toHaveBeenCalledTimes(1);
      expect(onAddOrDeleteItem).toHaveBeenCalledWith([emptyStringItem]);
    });

    it("Creates an empty number item when number is selected and 'Add new' is pressed", async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: [] });

      const numberOption = screen.getByRole('option', { name: texts.typeSelectorOptions.number });
      await user.selectOptions(getTypeSelector(), numberOption);
      await user.click(getAddButton());

      expect(onAddOrDeleteItem).toHaveBeenCalledTimes(1);
      expect(onAddOrDeleteItem).toHaveBeenCalledWith([emptyNumberItem]);
    });

    it("Creates an empty boolean item when boolean is selected and 'Add new' is pressed", async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: [] });

      const booleanOption = screen.getByRole('option', { name: texts.typeSelectorOptions.boolean });
      await user.selectOptions(getTypeSelector(), booleanOption);
      await user.click(getAddButton());

      expect(onAddOrDeleteItem).toHaveBeenCalledTimes(1);
      expect(onAddOrDeleteItem).toHaveBeenCalledWith([emptyBooleanItem]);
    });

    it('Creates an empty string item when the last element in code list is a string', async () => {
      const user = userEvent.setup();
      renderCodeListEditor();

      const addButton = screen.getByRole('button', { name: texts.add });
      await user.click(addButton);

      expect(onAddOrDeleteItem).toHaveBeenCalledTimes(1);
      expect(onAddOrDeleteItem).toHaveBeenCalledWith([
        ...codeListWithoutTextResources,
        emptyStringItem,
      ]);
    });

    it('Creates an empty number item when the last element in code list is a number', async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: codeListWithNumbers });

      const addButton = screen.getByRole('button', { name: texts.add });
      await user.click(addButton);

      expect(onAddOrDeleteItem).toHaveBeenCalledTimes(1);
      expect(onAddOrDeleteItem).toHaveBeenCalledWith([...codeListWithNumbers, emptyNumberItem]);
    });

    it('Creates an empty boolean item when the last element in code list is a boolean', async () => {
      const user = userEvent.setup();
      const codeListWithTrueValue = [{ label: 'test', value: true }];
      renderCodeListEditor({ codeList: codeListWithTrueValue });

      const addButton = screen.getByRole('button', { name: texts.add });
      await user.click(addButton);

      expect(onAddOrDeleteItem).toHaveBeenCalledTimes(1);
      expect(onAddOrDeleteItem).toHaveBeenCalledWith([...codeListWithTrueValue, emptyBooleanItem]);
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

      expect(onBlurAny).toHaveBeenCalledTimes(1);
      expect(onBlurAny).toHaveBeenCalledWith([
        { ...codeListWithoutTextResources[0], value: changedValue },
        codeListWithoutTextResources[1],
        codeListWithoutTextResources[2],
      ]);
    });

    it('Saves changed item value as number when initial value was a number', async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: codeListWithNumbers });

      const valueInput = screen.getByRole('textbox', { name: texts.itemValue(1) });
      await user.type(valueInput, '10');
      await user.tab();

      expect(onBlurAny).toHaveBeenCalledTimes(1);
      expect(onBlurAny).toHaveBeenCalledWith([
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

      expect(onBlurAny).toHaveBeenCalledWith([...codeListWithNumbers]);
    });

    it('Saves changed item value as boolean when initial value was a boolean', async () => {
      const user = userEvent.setup();
      const codeListWithSingleBooleanValue: CodeList = [codeListWithBooleans[0]];
      renderCodeListEditor({ codeList: codeListWithSingleBooleanValue });

      const valueInput = screen.getByRole('checkbox', { name: texts.itemValue(1) });
      await user.click(valueInput);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith([{ ...codeListWithBooleans[0], value: false }]);
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
