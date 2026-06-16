import {
  addCodeListToMap,
  createCodeListMap,
  deleteCodeListFromMap,
  updateCodeListFileInMap,
  validateCodeListMap,
} from './utils';
import { codeListMap, coloursKey, countriesKey, fruitsKey } from './test-data/codeListMap';
import { codeLists, coloursFile, countriesFile, fruitsFile } from './test-data/codeLists';
import type { CodeListMapError } from './types/CodeListMapError';
import type { CodeListFile } from '../../../types/CodeListFile';
import type { CodeList } from '../../../types/CodeList';
import type { CodeListFileMap } from './types/CodeListFileMap';

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
      const result = updateCodeListFileInMap(codeListMap, coloursKey, updatedCodeListData);
      expect(result.size).toBe(codeListMap.size);
      expect(result.get(coloursKey)).toEqual(updatedCodeListData);
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
      const result = deleteCodeListFromMap(codeListMap, coloursKey);
      expect(result.size).toBe(codeListMap.size - 1);
      expect(result.has(coloursKey)).toBe(false);
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
        [coloursKey, coloursFile],
      ]);
      const result = validateCodeListMap(map);
      const expectedResult: CodeListMapError[] = ['missing_name'];
      expect(result).toEqual(expectedResult);
    });

    it('Includes the duplicate name keyword when two code lists have the same name', () => {
      const map: CodeListFileMap = new Map<string, CodeListFile>([
        [countriesKey, countriesFile],
        [fruitsKey, fruitsFile],
        [coloursKey, { ...coloursFile, name: fruitsFile.name }],
      ]);
      const result = validateCodeListMap(map);
      const expectedResult: CodeListMapError[] = ['duplicate_name'];
      expect(result).toEqual(expectedResult);
    });

    it('Includes all errors when multiple validation errors are present', () => {
      const map: CodeListFileMap = new Map<string, CodeListFile>([
        [countriesKey, { ...countriesFile, name: '' }],
        [fruitsKey, fruitsFile],
        [coloursKey, { ...coloursFile, name: fruitsFile.name }],
      ]);
      const result = validateCodeListMap(map);
      const expectedResult: CodeListMapError[] = ['missing_name', 'duplicate_name'];
      expect(result).toEqual(expectedResult);
    });
  });
});
