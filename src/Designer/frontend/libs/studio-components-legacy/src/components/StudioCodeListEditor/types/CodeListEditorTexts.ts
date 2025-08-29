import type { ValueError } from './ValueError';
import type { TextResourceInputTexts } from '../../StudioTextResourceInput';
import type { CodeListItemTextProperty } from './CodeListItemTextProperty';
import type { CodeListItemType } from './CodeListItemType';

export type CodeListEditorTexts = {
  add: string;
  codeList: string;
  delete: string;
  deleteItem: (number: number) => string;
  description: string;
  disabledAddButtonTooltip: string;
  emptyCodeList: string;
  generalError: string;
  helpText: string;
  itemDescription: (number: number) => string;
  itemHelpText: (number: number) => string;
  itemLabel: (number: number) => string;
  itemValue: (number: number) => string;
  label: string;
  textResourceTexts: (number: number, property: CodeListItemTextProperty) => TextResourceInputTexts;
  typeSelectorDescription?: string;
  typeSelectorLabel: string;
  typeSelectorOptions: TypeSelectorOptionTexts;
  value: string;
  valueErrors: ValueErrorMessages;
};

export type TypeSelectorOptionTexts = Record<CodeListItemType, string>;

export type ValueErrorMessages = Record<ValueError, string>;
