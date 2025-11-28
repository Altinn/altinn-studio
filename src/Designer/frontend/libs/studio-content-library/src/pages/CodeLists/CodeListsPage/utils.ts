import { ArrayUtils, ReadonlyMapUtils } from '@studio/pure-functions';
import type { CodeListMap } from './types/CodeListMap';
import type { CodeListData } from '../../../types/CodeListData';
import { v4 as uuid } from 'uuid';
import type { CodeListMapError } from './types/CodeListMapError';

export function createCodeListMap(codeLists: CodeListData[]): CodeListMap {
  const entries: [string, CodeListData][] = codeLists.map((codeList) => [uuid(), codeList]);
  return new Map<string, CodeListData>(entries);
}

export function updateCodeListDataInMap(
  codeListMap: CodeListMap,
  id: string,
  updatedData: CodeListData,
): CodeListMap {
  return ReadonlyMapUtils.updateValue(codeListMap, id, updatedData);
}

export function addCodeListToMap(codeListMap: CodeListMap): CodeListMap {
  const key = uuid();
  const emptyData: CodeListData = { name: '', codes: [] };
  return ReadonlyMapUtils.prependEntry(codeListMap, key, emptyData);
}

export function deleteCodeListFromMap(codeListMap: CodeListMap, id: string): CodeListMap {
  return ReadonlyMapUtils.deleteEntry(codeListMap, id);
}

export function validateCodeListMap(codeListMap: CodeListMap): CodeListMapError[] {
  const errors: CodeListMapError[] = [];
  if (hasCodeListWithEmptyName(codeListMap)) errors.push('missing_name');
  if (hasDuplicateCodeListNames(codeListMap)) errors.push('duplicate_name');
  return errors;
}

function hasCodeListWithEmptyName(codeListMap: CodeListMap): boolean {
  return [...codeListMap.values()].some((codeList) => codeList.name === '');
}

function hasDuplicateCodeListNames(codeListMap: CodeListMap): boolean {
  const names = [...codeListMap.values()].map((codeList) => codeList.name);
  const notEmptyNames = names.filter((name) => name !== '');
  return !ArrayUtils.areItemsUnique(notEmptyNames);
}
