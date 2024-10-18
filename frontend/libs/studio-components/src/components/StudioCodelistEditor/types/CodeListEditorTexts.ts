import { CodeListError } from './CodeListError';

export type CodeListEditorTexts = {
  add: string;
  codeList: string;
  delete: string;
  deleteItem: (number: number) => string;
  description: string;
  emptyCodeList: string;
  errors: ErrorMessages;
  itemDescription: (number: number) => string;
  itemLabel: (number: number) => string;
  itemValue: (number: number) => string;
  label: string;
  value: string;
};

type ErrorMessages = Record<CodeListError, string>;
