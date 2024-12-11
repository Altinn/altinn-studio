import type { CodeListItem } from './types/CodeListItem';
import type { CodeList } from './types/CodeList';
import { ArrayUtils } from '@studio/pure-functions';
import type { CodeListValueType } from './types/CodeListValueType';

export function addEmptyCodeListItem(codeList: CodeList): CodeList {
  const emptyItem: CodeListItem = {
    value: '',
    label: '',
  };
  return addCodeListItem(codeList, emptyItem);
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

export function getCodeListValueType(codeList: CodeList): CodeListValueType {
  switch (true) {
    case areAllValuesBoolean(codeList):
      return 'boolean';
    case areAllValuesNumber(codeList):
      return 'number';
    case areSomeValuesEmptyString(codeList):
      return 'undefined';
    default:
      return 'string';
  }
}

function areAllValuesBoolean(codeList: CodeList): boolean {
  let result = true;
  codeList.forEach((codeListItem) => {
    if (String(codeListItem.value) !== 'true' && String(codeListItem.value) !== 'false') {
      result = false;
    }
  });

  return result;
}

function areAllValuesNumber(codeList: CodeList): boolean {
  let result = true;
  codeList.forEach((codeListItem) => {
    if (isNaN(Number(codeListItem.value)) || codeListItem.value === '') {
      result = false;
    }
  });

  return result;
}

function areSomeValuesEmptyString(codeList: CodeList): boolean {
  return codeList.some((codeListItem) => codeListItem.value === '');
}
