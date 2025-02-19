import type { ValueError } from './ValueError';
import type { TextResourceInputTexts } from '../../StudioTextResourceInput';
import type { CodeListItemTextProperty } from './CodeListItemTextProperty';

export type CodeListEditorTexts = {
  add: string;
  codeList: string;
  delete: string;
  deleteItem: (number: number) => string;
  deleteItemConfirmation: (number: number) => string;
  description: string;
  emptyCodeList: string;
  generalError: string;
  helpText: string;
  itemDescription: (number: number) => string;
  itemHelpText: (number: number) => string;
  itemLabel: (number: number) => string;
  itemValue: (number: number) => string;
  label: string;
  textResourceTexts: (number: number, property: CodeListItemTextProperty) => TextResourceInputTexts;
  value: string;
  valueErrors: ValueErrorMessages;
};

export type ValueErrorMessages = Record<ValueError, string>;
