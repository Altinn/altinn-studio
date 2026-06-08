import { ArrayUtils, FileNameUtils, ReadonlyMapUtils } from '@studio/pure-functions';
import { v4 as uuid } from 'uuid';
import type { CodeListMapError } from './types/CodeListMapError';
import type {
  CodeListFile,
  CodeListFileWithProblem,
  OrdinaryCodeListFile,
} from '../../../types/CodeListFile';
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

export function areFileMapsEqual(map1: CodeListFileMap, map2: CodeListFileMap): boolean {
  return (
    areFileKeysEqual(map1, map2) &&
    map1.keys().every((key) => areFilesEqualIfNoError(map1.get(key), map2.get(key)))
  );
}

function areFileKeysEqual(map1: CodeListFileMap, map2: CodeListFileMap): boolean {
  const keysMap1 = map1.keys().toArray();
  const keysMap2 = map2.keys().toArray();
  return ArrayUtils.arraysEqualUnordered(keysMap1, keysMap2);
}

function areFilesEqualIfNoError(file1: CodeListFile, file2: CodeListFile): boolean {
  return hasProblem(file1) || hasProblem(file2) || areFilesEqual(file1, file2);
}

function hasProblem(file: CodeListFile): file is CodeListFileWithProblem {
  return file.hasOwnProperty('problem');
}

function areFilesEqual(file1: OrdinaryCodeListFile, file2: OrdinaryCodeListFile): boolean {
  return file1.name === file2.name && file1.content === file2.content;
}
