import type { CodeListItem } from '../types/CodeListItem';
import type { MultiLanguageText } from '../../../types/MultiLanguageText';

export function changeLabel(item: CodeListItem, language: string, label: string): CodeListItem {
  return { ...item, label: changeText(language, label, item.label) };
}

export function changeDescription(
  item: CodeListItem,
  language: string,
  description: string,
): CodeListItem {
  return { ...item, description: changeText(language, description, item.description) };
}

export function changeHelpText(
  item: CodeListItem,
  language: string,
  helpText: string,
): CodeListItem {
  return { ...item, helpText: changeText(language, helpText, item.helpText) };
}

function changeText(
  language: string,
  newText: string,
  currentTexts: MultiLanguageText = {},
): MultiLanguageText {
  return {
    ...currentTexts,
    [language]: newText,
  };
}

export function changeValue(item: CodeListItem, value: string): CodeListItem {
  return { ...item, value };
}

export function getLabel(item: CodeListItem, language: string): string {
  return item.label?.[language] ?? '';
}

export function getDescription(item: CodeListItem, language: string): string {
  return item.description?.[language] ?? '';
}

export function getHelpText(item: CodeListItem, language: string): string {
  return item.helpText?.[language] ?? '';
}
