import type { CodeListItem } from '../types/CodeListItem';
import type { CodeListItemValue } from '../types/CodeListItemValue';
import { CodeListValueType } from '../types/CodeListValueType';

export function changeLabel(item: CodeListItem, label: string): CodeListItem {
  return { ...item, label };
}

export function changeDescription(item: CodeListItem, description: string): CodeListItem {
  return { ...item, description };
}

export function changeValue(
  item: CodeListItem,
  value: string,
  valueType: CodeListValueType,
): CodeListItem {
  const convertedValue = convertValue(value, valueType);
  return { ...item, value: convertedValue };
}

export function changeHelpText(item: CodeListItem, helpText: string): CodeListItem {
  return { ...item, helpText };
}

export function convertValue(value: string, valueType: CodeListValueType): CodeListItemValue {
  if (valueType === CodeListValueType.String) return String(value);
  if (valueType === CodeListValueType.Number) return Number(value);
  if (valueType === CodeListValueType.Boolean) return Boolean(value); // Does not work correctly
}
