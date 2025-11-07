import { ReadonlyMapUtils } from '@studio/pure-functions';
import type { CodeListMap } from './types/CodeListMap';
import type { CodeListData } from '../../../../types/CodeListData';
import { v4 as uuid } from 'uuid';

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
