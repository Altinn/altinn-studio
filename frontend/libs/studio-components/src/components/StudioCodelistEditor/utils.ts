import type { CodeListItem } from './types/CodeListItem';
import type { CodeList } from './types/CodeList';
import type { CodeListItemValue } from './types/CodeListItemValue';
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
  value: true,
  label: '',
};

export function addEmptyCodeListItem(codeList: CodeList): CodeList {
  const emptyItem: CodeListItem = getEmptyItem(codeList);
  return addCodeListItem(codeList, emptyItem);
}

function getEmptyItem(codeList: CodeList): CodeListItem {
  const codeListValueType: CodeListItemValue = getCodeListValueType(codeList);
  switch (codeListValueType) {
    case 'number':
      return emptyNumberItem;
    case 'boolean':
      return emptyBooleanItem;
    default:
      return emptyStringItem;
  }
}

function getCodeListValueType(codeList: CodeList): CodeListItemValue {
  if (codeList.length === 0) return 'string';

  switch (typeof codeList[0].value) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'string';
  }
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
