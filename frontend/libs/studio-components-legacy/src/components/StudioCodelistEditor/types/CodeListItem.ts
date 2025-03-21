import type { CodeListItemValue } from './CodeListItemValue';

export type CodeListItem<T extends CodeListItemValue = CodeListItemValue> = {
  description?: string;
  helpText?: string;
  label: string;
  value: T;
};
