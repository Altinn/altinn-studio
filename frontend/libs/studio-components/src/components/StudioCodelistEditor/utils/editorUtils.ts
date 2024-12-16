import type { CodeListItem } from '../types/CodeListItem';
import type { CodeList } from '../types/CodeList';
import { ArrayUtils } from '@studio/pure-functions';

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
