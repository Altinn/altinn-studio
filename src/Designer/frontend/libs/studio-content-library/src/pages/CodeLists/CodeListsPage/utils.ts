import { ArrayUtils, FileNameUtils, ReadonlyMapUtils } from '@studio/pure-functions';
import { v4 as uuid } from 'uuid';
import type { CodeListMapError } from './types/CodeListMapError';
import type { CodeListFile } from '../../../types/CodeListFile';
import type { CodeListFileMap } from './types/CodeListFileMap';

export function createCodeListMap(codeLists: CodeListFile[]): CodeListFileMap {
  const entries: [string, CodeListFile][] = codeLists.map((codeList) => [uuid(), codeList]);
  return new Map<string, CodeListFile>(entries);
}

export function updateCodeListFileInMap(
  codeListMap: CodeListFileMap,
  id: string,
  updatedFile: CodeListFile,
): CodeListFileMap {
  return ReadonlyMapUtils.updateValue(codeListMap, id, updatedFile);
}

export function addCodeListToMap(codeListMap: CodeListFileMap): CodeListFileMap {
  const key = uuid();
  const emptyCodeListFile: CodeListFile = { name: '.json', content: JSON.stringify([]) };
  return ReadonlyMapUtils.prependEntry(codeListMap, key, emptyCodeListFile);
}

export function deleteCodeListFromMap(codeListMap: CodeListFileMap, id: string): CodeListFileMap {
  return ReadonlyMapUtils.deleteEntry(codeListMap, id);
}

export function validateCodeListMap(codeListMap: CodeListFileMap): CodeListMapError[] {
  const errors: CodeListMapError[] = [];
  if (hasCodeListWithEmptyName(codeListMap)) errors.push('missing_name');
  if (hasDuplicateCodeListNames(codeListMap)) errors.push('duplicate_name');
  return errors;
}

function hasCodeListWithEmptyName(codeListMap: CodeListFileMap): boolean {
  return codeListNames(codeListMap).includes('');
}

function hasDuplicateCodeListNames(codeListMap: CodeListFileMap): boolean {
  const notEmptyNames = codeListNames(codeListMap).filter((name) => name !== '');
  return !ArrayUtils.areItemsUnique(notEmptyNames);
}

function codeListNames(codeListMap: CodeListFileMap): string[] {
  return [...codeListMap.values()].map(({ name }) => FileNameUtils.removeExtension(name));
}
