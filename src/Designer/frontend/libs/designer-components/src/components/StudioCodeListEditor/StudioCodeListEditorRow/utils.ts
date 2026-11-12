import type { MultiLanguageCodeListItem } from '../types/CodeListItem';
import type { MultiLanguageText } from '../../../types/MultiLanguageText';

export function changeLabel(
  item: MultiLanguageCodeListItem,
  language: string,
  label: string,
): MultiLanguageCodeListItem {
  return { ...item, label: changeText(language, label, item.label) };
}

export function changeDescription(
  item: MultiLanguageCodeListItem,
  language: string,
  description: string,
): MultiLanguageCodeListItem {
  return { ...item, description: changeText(language, description, item.description) };
}

export function changeHelpText(
  item: MultiLanguageCodeListItem,
  language: string,
  helpText: string,
): MultiLanguageCodeListItem {
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

export function changeValue(
  item: MultiLanguageCodeListItem,
  value: string,
): MultiLanguageCodeListItem {
  return { ...item, value };
}

export function getLabel(item: MultiLanguageCodeListItem, language: string): string {
  return item.label?.[language] ?? '';
}

export function getDescription(item: MultiLanguageCodeListItem, language: string): string {
  return item.description?.[language] ?? '';
}

export function getHelpText(item: MultiLanguageCodeListItem, language: string): string {
  return item.helpText?.[language] ?? '';
}
