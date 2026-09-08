import {
  addCodeListToMap,
  areFileMapsEqual,
  createCodeListMap,
  deleteCodeListFromMap,
  updateCodeListFileInMap,
  validateCodeListMap,
} from './utils';
import { codeListMap, colorsKey, countriesKey, fruitsKey } from './test-data/codeListMap';
import { codeLists, colorsFile, countriesFile, fruitsFile } from './test-data/codeLists';
import type { CodeListMapError } from './types/CodeListMapError';
import type {
  CodeListFile,
  CodeListFileWithProblem,
  OrdinaryCodeListFile,
} from '../../../types/CodeListFile';
import type { CodeList } from '../../../types/CodeList';
import type { CodeListFileMap } from './types/CodeListFileMap';
import { ObjectUtils, ReadonlyMapUtils } from '@studio/pure-functions';

describe('CodeListsPage utils', () => {
  describe('createCodeListMap', () => {
    it('Returns a map with the input code lists', () => {
      const result = createCodeListMap(codeLists);
      expect([...result.values()]).toEqual(codeLists);
    });
  });

  describe('updateCodeListFileInMap', () => {
    it('Updates the code list data for the given id', () => {
      const updatedCodeListData: CodeListFile = {
        name: 'new name',
        content: JSON.stringify([
          { value: '1', label: { nb: 'En', en: 'One' } },
          { value: '2', label: { nb: 'To', en: 'Two' } },
        ] satisfies CodeList),
      };
      const result = updateCodeListFileInMap(codeListMap, colorsKey, updatedCodeListData);
      expect(result.size).toBe(codeListMap.size);
      expect(result.get(colorsKey)).toEqual(updatedCodeListData);
    });
  });

  describe('addCodeListToMap', () => {
    it('Prepends an empty code list to the map', () => {
      const newMap = addCodeListToMap(codeListMap);
      expect(newMap.size).toBe(codeListMap.size + 1);
      expect(newMap.values().next().value).toEqual({
        name: '.json',
        content: '[]',
      } satisfies CodeListFile);
    });
  });

  describe('deleteCodeListFromMap', () => {
    it('Deletes the code list data for the given id', () => {
      const result = deleteCodeListFromMap(codeListMap, colorsKey);
      expect(result.size).toBe(codeListMap.size - 1);
      expect(result.has(colorsKey)).toBe(false);
    });
  });

  describe('validateCodeListMap', () => {
    it('Returns an empty array when there are no validation errors', () => {
      const result = validateCodeListMap(codeListMap);
      expect(result).toEqual([]);
    });

    it('Includes the missing name keyword when a code list has a missing name', () => {
      const map: CodeListFileMap = new Map<string, CodeListFile>([
        [countriesKey, { ...countriesFile, name: '.json' }],
        [fruitsKey, fruitsFile],
        [colorsKey, colorsFile],
      ]);
      const result = validateCodeListMap(map);
      const expectedResult: CodeListMapError[] = ['missing_name'];
      expect(result).toEqual(expectedResult);
    });

    it('Includes the duplicate name keyword when two code lists have the same name', () => {
      const map: CodeListFileMap = new Map<string, CodeListFile>([
        [countriesKey, countriesFile],
        [fruitsKey, fruitsFile],
        [colorsKey, { ...colorsFile, name: fruitsFile.name }],
      ]);
      const result = validateCodeListMap(map);
      const expectedResult: CodeListMapError[] = ['duplicate_name'];
      expect(result).toEqual(expectedResult);
    });

    it('Includes all errors when multiple validation errors are present', () => {
      const map: CodeListFileMap = new Map<string, CodeListFile>([
        [countriesKey, { ...countriesFile, name: '' }],
        [fruitsKey, fruitsFile],
        [colorsKey, { ...colorsFile, name: fruitsFile.name }],
      ]);
      const result = validateCodeListMap(map);
      const expectedResult: CodeListMapError[] = ['missing_name', 'duplicate_name'];
      expect(result).toEqual(expectedResult);
    });
  });

  describe('areFileMapsEqual', () => {
    it('Returns true when the two maps contain the same list of files', () => {
      const map1 = codeListMap;
      const map2 = createMutableCodeListFileMapClone(map1);
      expect(areFileMapsEqual(map1, map2)).toBe(true);
    });

    it('Returns true when both maps are empty', () => {
      expect(areFileMapsEqual(new Map(), new Map())).toBe(true);
    });

    it('Returns false when one of the files has different names', () => {
      const map1 = codeListMap;
      const map2 = createMutableCodeListFileMapClone(map1);
      map2.set(colorsKey, { ...colorsFile, name: 'something-else.json' });
      expect(areFileMapsEqual(map1, map2)).toBe(false);
    });

    it('Returns false when one of the files has different content', () => {
      const map1 = codeListMap;
      const map2 = createMutableCodeListFileMapClone(map1);
      map2.set(colorsKey, { ...colorsFile, content: '[]' });
      expect(areFileMapsEqual(map1, map2)).toBe(false);
    });

    it('Ignores files with backend problems', () => {
      const keyOfProblemFile = 'keyOfProblem';
      const nameOfProblemFile = 'backend-fail.json';
      const problemFile: CodeListFileWithProblem = { name: nameOfProblemFile, problem: {} };
      const noProblemFile: OrdinaryCodeListFile = { name: nameOfProblemFile, content: '[]' };
      const map1 = ReadonlyMapUtils.prependEntry(codeListMap, keyOfProblemFile, problemFile);
      const map2 = createMutableCodeListFileMapClone(map1);
      map2.set(keyOfProblemFile, noProblemFile);
      expect(areFileMapsEqual(map1, map2)).toBe(true);
    });
  });
});

function createMutableCodeListFileMapClone(map: CodeListFileMap): Map<string, CodeListFile> {
  return new Map(ObjectUtils.deepCopy<[string, CodeListFile][]>(Array.from(map)));
}
