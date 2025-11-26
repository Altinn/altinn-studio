import {
  addCodeListToMap,
  createCodeListMap,
  deleteCodeListFromMap,
  updateCodeListDataInMap,
  validateCodeListMap,
} from './utils';
import { codeListMap, coloursKey, countriesKey, fruitsKey } from './test-data/codeListMap';
import type { CodeListData } from '../../../types/CodeListData';
import { codeLists, coloursData, countriesData, fruitsData } from './test-data/codeLists';
import type { CodeListMapError } from './types/CodeListMapError';
import type { CodeListMap } from './types/CodeListMap';

describe('CodeListsPage utils', () => {
  describe('createCodeListMap', () => {
    it('Returns a map with the input code lists', () => {
      const result = createCodeListMap(codeLists);
      expect([...result.values()]).toEqual(codeLists);
    });
  });

  describe('updateCodeListDataInMap', () => {
    it('Updates the code list data for the given id', () => {
      const updatedCodeListData: CodeListData = {
        name: 'new name',
        codes: [
          { value: '1', label: { nb: 'En', en: 'One' } },
          { value: '2', label: { nb: 'To', en: 'Two' } },
        ],
      };
      const result = updateCodeListDataInMap(codeListMap, coloursKey, updatedCodeListData);
      expect(result.size).toBe(codeListMap.size);
      expect(result.get(coloursKey)).toEqual(updatedCodeListData);
    });
  });

  describe('addCodeListToMap', () => {
    it('Prepends an empty code list to the map', () => {
      const newMap = addCodeListToMap(codeListMap);
      expect(newMap.size).toBe(codeListMap.size + 1);
      expect(newMap.values().next().value).toEqual({ name: '', codes: [] } satisfies CodeListData);
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
      const map: CodeListMap = new Map<string, CodeListData>([
        [countriesKey, { ...countriesData, name: '' }],
        [fruitsKey, fruitsData],
        [coloursKey, coloursData],
      ]);
      const result = validateCodeListMap(map);
      const expectedResult: CodeListMapError[] = ['missing_name'];
      expect(result).toEqual(expectedResult);
    });

    it('Includes the duplicate name keyword when two code lists have the same name', () => {
      const map: CodeListMap = new Map<string, CodeListData>([
        [countriesKey, countriesData],
        [fruitsKey, fruitsData],
        [coloursKey, { ...coloursData, name: fruitsData.name }],
      ]);
      const result = validateCodeListMap(map);
      const expectedResult: CodeListMapError[] = ['duplicate_name'];
      expect(result).toEqual(expectedResult);
    });

    it('Includes all errors when multiple validation errors are present', () => {
      const map: CodeListMap = new Map<string, CodeListData>([
        [countriesKey, { ...countriesData, name: '' }],
        [fruitsKey, fruitsData],
        [coloursKey, { ...coloursData, name: fruitsData.name }],
      ]);
      const result = validateCodeListMap(map);
      const expectedResult: CodeListMapError[] = ['missing_name', 'duplicate_name'];
      expect(result).toEqual(expectedResult);
    });
  });
});
