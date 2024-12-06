import type { CodeListItem } from '../types/CodeListItem';
import type { CodeListItemValue } from '../types/CodeListItemValue';
import { CodeListType } from '../types/CodeListType';

export function changeLabel(item: CodeListItem, label: string): CodeListItem {
  return { ...item, label };
}

export function changeDescription(item: CodeListItem, description: string): CodeListItem {
  return { ...item, description };
}

export function changeValue(item: CodeListItem, value: CodeListItemValue): CodeListItem {
  return { ...item, value };
}

export function changeHelpText(item: CodeListItem, helpText: string): CodeListItem {
  return { ...item, helpText };
}

export function coerceValue(updatedValue: string, codeListType: CodeListType): CodeListItemValue {
  if (codeListType === 'string') return String(updatedValue);
  if (codeListType === 'number') return Number(updatedValue); // Needs validation for NaN
  if (codeListType === 'boolean') return updatedValue.toLowerCase() === 'true';

  throw new Error('Invalid value in codelist');
}
