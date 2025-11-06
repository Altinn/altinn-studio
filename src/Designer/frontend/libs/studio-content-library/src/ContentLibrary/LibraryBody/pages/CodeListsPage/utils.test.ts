import {
  addCodeListToMap,
  createCodeListMap,
  deleteCodeListFromMap,
  updateCodeListDataInMap,
} from './utils';
import { codeListMap, coloursKey } from './test-data/codeListMap';
import type { CodeListData } from './types/CodeListData';
import { codeLists } from './test-data/codeLists';

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
});
