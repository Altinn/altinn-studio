import type { CodeListItem } from './types/CodeListItem';
import type { CodeList } from './types/CodeList';
import { ArrayUtils } from '@studio/pure-functions';
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
