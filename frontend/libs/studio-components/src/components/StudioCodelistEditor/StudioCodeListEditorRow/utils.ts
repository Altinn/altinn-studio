import type { CodeListItem } from '../types/CodeListItem';
import type { CodeListItemValue } from '../types/CodeListItemValue';
import type { CodeListValueType } from '../types/CodeListValueType';

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

export function coerceValue(
  value: string,
  codeListValueType: CodeListValueType,
): CodeListItemValue {
  if (codeListValueType === 'string') return String(value);
  if (codeListValueType === 'number') return coerceNumber(value);
  if (codeListValueType === 'boolean') return coerceBoolean(value);

  throw new Error('Invalid value in codelist');
}

function coerceNumber(value: string): number | string {
  const valueAsNumber = Number(value);
  if (isNaN(valueAsNumber)) return value;
  else return valueAsNumber;
}

function coerceBoolean(value: string): boolean | string {
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  else return String(value);
}
