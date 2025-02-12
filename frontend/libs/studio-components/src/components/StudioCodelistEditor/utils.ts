import type { CodeListItem } from './types/CodeListItem';
import type { CodeList } from './types/CodeList';
import type { TypeofResult } from './types/TypeofResult';
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

export function addNewCodeListItem(
  codeList: CodeList,
  valueType?: 'string' | 'number' | 'boolean',
): CodeList {
  const newEmptyItem = createNewEmptyItem(codeList, valueType);
  return addCodeListItem(codeList, newEmptyItem);
}

function createNewEmptyItem(
  codeList: CodeList,
  valueType?: 'string' | 'number' | 'boolean',
): CodeListItem {
  const typeToCreate = valueType ?? getTypeOfLastValue(codeList);

  switch (typeToCreate) {
    case 'number':
      return emptyNumberItem;
    case 'boolean':
      return emptyBooleanItem;
    default:
      return emptyStringItem;
  }
}

export function getTypeOfLastValue(codeList: CodeList): TypeofResult {
  if (isCodeListEmpty(codeList)) {
    throw new Error('Cannot get type of last value from empty code list');
  }
  const lastCodeListItem = ArrayUtils.last(codeList);
  return typeof lastCodeListItem.value;
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
