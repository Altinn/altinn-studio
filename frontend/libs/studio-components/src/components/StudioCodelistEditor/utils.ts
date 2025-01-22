import type { CodeListItem } from './types/CodeListItem';
import type { CodeList } from './types/CodeList';
import { ArrayUtils } from '@studio/pure-functions';

export const emptyStringItem: CodeListItem = {
  value: '',
  label: '',
};

export const emptyNumberItem: CodeListItem = {
  value: 0,
  label: '',
};

export const emptyBooleanItem: CodeListItem = {
  value: false,
  label: '',
};

export function addEmptyCodeListItem(codeList: CodeList): CodeList {
  const emptyItem: CodeListItem = getEmptyItem(codeList);
  return addCodeListItem(codeList, emptyItem);
}

function getEmptyItem(codeList: CodeList): CodeListItem {
  if (codeList.length === 0) return emptyStringItem;

  switch (getTypeOfLastValue(codeList)) {
    case 'number':
      return emptyNumberItem;
    case 'boolean':
      return emptyBooleanItem;
    default:
      return emptyStringItem;
  }
}

function getTypeOfLastValue(codeList: CodeList) {
  const lastCodeListItem = codeList[codeList.length - 1];
  return typeof lastCodeListItem.value as 'string' | 'number' | 'boolean';
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
