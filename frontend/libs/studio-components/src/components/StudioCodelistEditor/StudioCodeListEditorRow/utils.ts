import type { CodeListItem } from '../types/CodeListItem';
import type { CodeListItemValue } from '../types/CodeListItemValue';

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
