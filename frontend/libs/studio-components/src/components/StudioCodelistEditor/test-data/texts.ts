import { CodeListItemTextProperty } from '../types/CodeListItemTextProperty';
import type { CodeListEditorTexts, ValueErrorMessages } from '../types/CodeListEditorTexts';
import type { TextResourceInputTexts } from '../../StudioTextResourceInput';

const valueErrors: ValueErrorMessages = {
  duplicateValue: 'The code must be unique.',
  multipleTypes: 'All codes must be of the same type.',
  nullValue: 'The code cannot be empty.',
};

export const texts: CodeListEditorTexts = {
  add: 'Add',
  codeList: 'Code list',
  delete: 'Delete',
  deleteItem: (number) => `Delete code number ${number}`,
  description: 'Description',
  emptyCodeList: 'The code list is empty.',
  generalError: 'The code list cannot be saved because it is not valid.',
  helpText: 'Help text',
  itemDescription: (number) => `Description for code number ${number}`,
  itemHelpText: (number) => `Help text for code number ${number}`,
  itemLabel: (number) => `Label for code number ${number}`,
  itemValue: (number) => `Code number ${number}`,
  label: 'Label',
  textResourceTexts,
  value: 'Code',
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
      return `Label edit mode for code number ${rowNumber}`;
    case CodeListItemTextProperty.Description:
      return `Description edit mode for code number ${rowNumber}`;
    case CodeListItemTextProperty.HelpText:
      return `Help text edit mode for code number ${rowNumber}`;
  }
}

function createTextResourceSearchButtonTitle(
  rowNumber: number,
  property: CodeListItemTextProperty,
): string {
  switch (property) {
    case CodeListItemTextProperty.Label:
      return `Label search mode for code number ${rowNumber}`;
    case CodeListItemTextProperty.Description:
      return `Description search mode for code number ${rowNumber}`;
    case CodeListItemTextProperty.HelpText:
      return `Help text search mode for code number ${rowNumber}`;
  }
}

function createTextResourcePickerLabel(
  rowNumber: number,
  property: CodeListItemTextProperty,
): string {
  switch (property) {
    case CodeListItemTextProperty.Label:
      return `Choose label for code number ${rowNumber}`;
    case CodeListItemTextProperty.Description:
      return `Choose description for code number ${rowNumber}`;
    case CodeListItemTextProperty.HelpText:
      return `Choose help text for code number ${rowNumber}`;
  }
}

function createTextResourceValueLabel(
  rowNumber: number,
  property: CodeListItemTextProperty,
): string {
  switch (property) {
    case CodeListItemTextProperty.Label:
      return `Label for code number ${rowNumber}`;
    case CodeListItemTextProperty.Description:
      return `Description for code number ${rowNumber}`;
    case CodeListItemTextProperty.HelpText:
      return `Help text for code number ${rowNumber}`;
  }
}
