import { CodeListItemTextProperty } from '../types/CodeListItemTextProperty';
import type {
  CodeListEditorTexts,
  TypeSelectorOptionTexts,
  ValueErrorMessages,
} from '../types/CodeListEditorTexts';
import type { TextResourceInputTexts } from '../../StudioTextResourceInput';

const valueErrors: ValueErrorMessages = {
  duplicateValue: 'The value must be unique.',
  multipleTypes: 'All values must be of the same type.',
  nullValue: 'The value cannot be empty.',
};

const typeSelectorOptions: TypeSelectorOptionTexts = {
  string: 'String',
  number: 'Number',
  boolean: 'Boolean',
};

export const texts: CodeListEditorTexts = {
  add: 'Add',
  codeList: 'Code list',
  delete: 'Delete',
  deleteItem: (number) => `Delete item number ${number}`,
  description: 'Description',
  emptyCodeList: 'The code list is empty.',
  generalError: 'The code list cannot be saved because it is not valid.',
  helpText: 'Help text',
  itemDescription: (number) => `Description for item number ${number}`,
  itemHelpText: (number) => `Help text for item number ${number}`,
  itemLabel: (number) => `Label for item number ${number}`,
  itemValue: (number) => `Value for item number ${number}`,
  label: 'Label',
  textResourceTexts,
  typeSelectorDescription: 'Choose the type of the codes.',
  typeSelectorLabel: 'Type',
  typeSelectorOptions,
  value: 'Value',
  valueErrors,
};

function textResourceTexts(
  rowNumber: number,
  property: CodeListItemTextProperty,
): TextResourceInputTexts {
  return {
    editValue: createTextResourceEditButtonTitle(rowNumber, property),
    idLabel: 'ID:',
    search: createTextResourceSearchButtonTitle(rowNumber, property),
    textResourcePickerLabel: createTextResourcePickerLabel(rowNumber, property),
    noTextResourceOptionLabel: 'None',
    valueLabel: createTextResourceValueLabel(rowNumber, property),
  };
}

function createTextResourceEditButtonTitle(
  rowNumber: number,
  property: CodeListItemTextProperty,
): string {
  switch (property) {
    case CodeListItemTextProperty.Label:
      return `Label edit mode for value number ${rowNumber}`;
    case CodeListItemTextProperty.Description:
      return `Description edit mode for value number ${rowNumber}`;
    case CodeListItemTextProperty.HelpText:
      return `Help text edit mode for value number ${rowNumber}`;
  }
}

function createTextResourceSearchButtonTitle(
  rowNumber: number,
  property: CodeListItemTextProperty,
): string {
  switch (property) {
    case CodeListItemTextProperty.Label:
      return `Label search mode for value number ${rowNumber}`;
    case CodeListItemTextProperty.Description:
      return `Description search mode for value number ${rowNumber}`;
    case CodeListItemTextProperty.HelpText:
      return `Help text search mode for value number ${rowNumber}`;
  }
}

function createTextResourcePickerLabel(
  rowNumber: number,
  property: CodeListItemTextProperty,
): string {
  switch (property) {
    case CodeListItemTextProperty.Label:
      return `Choose label for value number ${rowNumber}`;
    case CodeListItemTextProperty.Description:
      return `Choose description for value number ${rowNumber}`;
    case CodeListItemTextProperty.HelpText:
      return `Choose help text for value number ${rowNumber}`;
  }
}

function createTextResourceValueLabel(
  rowNumber: number,
  property: CodeListItemTextProperty,
): string {
  switch (property) {
    case CodeListItemTextProperty.Label:
      return `Label for value number ${rowNumber}`;
    case CodeListItemTextProperty.Description:
      return `Description for value number ${rowNumber}`;
    case CodeListItemTextProperty.HelpText:
      return `Help text for value number ${rowNumber}`;
  }
}
