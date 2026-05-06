import type { CodeListItem } from './types/CodeListItem';
import type { CodeList } from './types/CodeList';
import { ArrayUtils, ObjectUtils } from '@studio/pure-functions';
import type { CodeListItemTextProperty } from './enums/CodeListItemTextProperty';
import type { MultiLanguageText } from '../../types/MultiLanguageText';

export function addNewCodeListItem(codeList: CodeList): CodeList {
  const newEmptyItem = createEmptyItem();
  return addCodeListItem(codeList, newEmptyItem);
}

function createEmptyItem(): CodeListItem {
  return {
    value: '',
    label: {},
  };
}

function addCodeListItem(codeList: CodeList, item: CodeListItem): CodeList {
  return [...codeList, item];
}

export function removeCodeListItem(codeList: CodeList, index: number): CodeList {
  return ArrayUtils.removeItemByIndex<CodeListItem>(codeList, index);
}

export function changeCodeListItem(
  codeList: CodeList,
  index: number,
  newItem: CodeListItem,
): CodeList {
  return ArrayUtils.replaceByIndex<CodeListItem>(codeList, index, newItem);
}

export function isCodeListEmpty(codeList: CodeList): boolean {
  return codeList.length === 0;
}

export type UpdateCodeTextArgs = {
  codeItemIndex: number;
  language: string;
  newValue: string;
  property: CodeListItemTextProperty;
};

export function updateCodeText(codeList: CodeList, updateArgs: UpdateCodeTextArgs): CodeList {
  const { property, codeItemIndex, newValue } = updateArgs;
  const newCodeList: CodeList = [...codeList];
  const oldItem: CodeListItem = newCodeList[codeItemIndex];
  const oldProperty = oldItem[property] || {};
  const newProperty = updateMultiLanguageText(oldProperty, updateArgs.language, newValue);
  newCodeList[codeItemIndex] = { ...oldItem, [property]: newProperty };
  return newCodeList;
}

function updateMultiLanguageText(
  multiLanguageText: MultiLanguageText,
  language: string,
  value: string,
): MultiLanguageText {
  return {
    ...multiLanguageText,
    [language]: value,
  };
}

export function extractLanguageCodes(codeList: CodeList): string[] {
  const allCodes = codeList.reduce(
    (languageCodes, item) => [...languageCodes, ...extractLanguageCodesFromItem(item)],
    [],
  );
  return ArrayUtils.removeDuplicates(allCodes);
}

function extractLanguageCodesFromItem(item: CodeListItem): string[] {
  const labelCodes = extractLanguageCodesFromTextInstance(item.label || {});
  const descriptionCodes = extractLanguageCodesFromTextInstance(item.description || {});
  const helpTextCodes = extractLanguageCodesFromTextInstance(item.helpText || {});
  const allCodes = labelCodes.concat(descriptionCodes).concat(helpTextCodes);
  return ArrayUtils.removeDuplicates(allCodes);
}

function extractLanguageCodesFromTextInstance(textInstance: MultiLanguageText): string[] {
  return Object.keys(textInstance);
}

export function addLanguage(codeList: CodeList, languageCode: string): CodeList {
  return codeList.map((item) => addLanguageToItem(item, languageCode));
}

function addLanguageToItem(item: CodeListItem, languageCode: string): CodeListItem {
  return {
    ...item,
    label: addLanguageToTextInstance(item.label || {}, languageCode),
  };
}

function addLanguageToTextInstance(
  textInstance: MultiLanguageText,
  languageCode: string,
): MultiLanguageText {
  return languageCode in textInstance ? textInstance : { ...textInstance, [languageCode]: '' };
}

export function removeLanguage(codeList: CodeList, languageCode: string): CodeList {
  return codeList.map((item) => removeLanguageFromItem(item, languageCode));
}

function removeLanguageFromItem(item: CodeListItem, languageCode: string): CodeListItem {
  const newItem = ObjectUtils.shallowMutableCopy(item);
  if ('label' in item) newItem.label = removeLanguageFromTextInstance(item.label!, languageCode);
  if ('description' in item)
    newItem.description = removeLanguageFromTextInstance(item.description!, languageCode);
  if ('helpText' in item)
    newItem.helpText = removeLanguageFromTextInstance(item.helpText!, languageCode);
  return newItem as CodeListItem;
}

function removeLanguageFromTextInstance(
  textInstance: MultiLanguageText,
  languageCode: string,
): MultiLanguageText {
  const newInstance = ObjectUtils.shallowMutableCopy(textInstance);
  delete newInstance[languageCode];
  return newInstance as MultiLanguageText;
}

export function initialiseSelectedLanguage(
  codeList: CodeList,
  fallbackLanguageCode: string,
): string {
  return initialiseLanguageOptions(codeList, fallbackLanguageCode)[0];
}

export function initialiseLanguageOptions(
  codeList: CodeList,
  fallbackLanguageCode: string,
): [string, ...string[]] {
  const existingCodes = extractLanguageCodes(codeList);
  return ArrayUtils.isNotEmpty(existingCodes) ? existingCodes : [fallbackLanguageCode];
}
