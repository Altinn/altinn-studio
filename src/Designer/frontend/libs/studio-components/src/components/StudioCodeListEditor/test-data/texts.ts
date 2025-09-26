import type { CodeListEditorTexts, ValueErrorMessages } from '../types/CodeListEditorTexts';

const valueErrors: ValueErrorMessages = {
  duplicateValue: 'The code must be unique.',
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
  value: 'Code',
  valueErrors,
};
