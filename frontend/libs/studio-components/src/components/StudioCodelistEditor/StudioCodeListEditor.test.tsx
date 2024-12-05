import React from 'react';
import { render, screen } from '@testing-library/react';
import type { StudioCodeListEditorProps } from './StudioCodeListEditor';
import { StudioCodeListEditor } from './StudioCodeListEditor';
import type { CodeListEditorTexts } from './types/CodeListEditorTexts';
import type { CodeList } from './types/CodeList';
import userEvent from '@testing-library/user-event';

// Test data:
const texts: CodeListEditorTexts = {
  add: 'Add',
  codeList: 'Code list',
  delete: 'Delete',
  deleteItem: (number) => `Delete item number ${number}`,
  description: 'Description',
  emptyCodeList: 'The code list is empty.',
  valueErrors: {
    duplicateValue: 'The value must be unique.',
  },
  generalError: 'The code list cannot be saved because it is not valid.',
  helpText: 'Help text',
  itemDescription: (number) => `Description for item number ${number}`,
  itemHelpText: (number) => `Help text for item number ${number}`,
  itemLabel: (number) => `Label for item number ${number}`,
  itemValue: (number) => `Value for item number ${number}`,
  label: 'Label',
  value: 'Value',
};
const codeList: CodeList = [
  {
    label: 'Test 1',
    value: 'test1',
    description: 'Test 1 description',
    helpText: 'Test 1 help text',
  },
  {
    label: 'Test 2',
    value: 'test2',
    description: 'Test 2 description',
    helpText: 'Test 2 help text',
  },
  {
    label: 'Test 3',
    value: 'test3',
    description: 'Test 3 description',
    helpText: 'Test 3 help text',
  },
];
const onChange = jest.fn();
const onInvalid = jest.fn();
const defaultProps: StudioCodeListEditorProps = {
  codeList,
  texts,
  onChange,
  onInvalid,
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

  it('Renders a message when the code list is empty', () => {
    renderCodeListEditor({ codeList: [] });
    expect(screen.getByText(texts.emptyCodeList)).toBeInTheDocument();
  });

  it('Calls the onChange callback with the new code list when a label is changed', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const labelInput = screen.getByRole('textbox', { name: texts.itemLabel(1) });
    const newValue = 'new text';
    await user.type(labelInput, newValue);
    expect(onChange).toHaveBeenCalledTimes(newValue.length);
    expect(onChange).toHaveBeenLastCalledWith([
      { ...codeList[0], label: newValue },
      codeList[1],
      codeList[2],
    ]);
  });

  it('Calls the onChange callback with the new code list when a value is changed', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const valueInput = screen.getByRole('textbox', { name: texts.itemValue(1) });
    const newValue = 'new text';
    await user.type(valueInput, newValue);
    expect(onChange).toHaveBeenCalledTimes(newValue.length);
    expect(onChange).toHaveBeenLastCalledWith([
      { ...codeList[0], value: newValue },
      codeList[1],
      codeList[2],
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
      { ...codeList[0], description: newValue },
      codeList[1],
      codeList[2],
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
      { ...codeList[0], helpText: newValue },
      codeList[1],
      codeList[2],
    ]);
  });

  it('Calls the onChange callback with the new code list when an item is removed', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const deleteButton = screen.getByRole('button', { name: texts.deleteItem(1) });
    await user.click(deleteButton);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([codeList[1], codeList[2]]);
  });

  it('Calls the onChange callback with the new code list when an item is added', async () => {
    renderCodeListEditor();
    const addButton = screen.getByRole('button', { name: texts.add });
    await userEvent.click(addButton);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      ...codeList,
      {
        label: '',
        value: '',
      },
    ]);
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
    const numberOfCodeListItems = codeList.length;
    const expectedNumberOfRows = numberOfCodeListItems + numberOfHeadingRows;
    expect(screen.getAllByRole('row')).toHaveLength(expectedNumberOfRows);
    rerender(<StudioCodeListEditor {...defaultProps} codeList={newCodeList} />);
    const newNumberOfCodeListItems = newCodeList.length;
    const newExpectedNumberOfRows = newNumberOfCodeListItems + numberOfHeadingRows;
    expect(screen.getAllByRole('row')).toHaveLength(newExpectedNumberOfRows);
  });

  it('Applies invalid state to duplicated values', () => {
    renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
    const firstDuplicateInput = screen.getByRole('textbox', { name: texts.itemValue(1) });
    const secondDuplicateInput = screen.getByRole('textbox', { name: texts.itemValue(2) });
    expect(firstDuplicateInput).toBeInvalid();
    expect(secondDuplicateInput).toBeInvalid();
  });

  it('Does not apply invalid state to unique values when other values are duplicated', () => {
    renderCodeListEditor();
    const uniqueValueInput = screen.getByRole('textbox', { name: texts.itemValue(3) });
    expect(uniqueValueInput).toBeValid();
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

function renderCodeListEditor(props: Partial<StudioCodeListEditorProps> = {}) {
  return render(<StudioCodeListEditor {...defaultProps} {...props} />);
}
