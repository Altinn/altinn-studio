import { updateCodes, updateName } from './utils';
import { fruitsData } from '../test-data/codeLists';
import type { CodeList } from '../../../../../types/CodeList';

describe('CodeListDataEditor utils', () => {
  describe('updateName', () => {
    it('Updates the name of the code list', () => {
      const newName = 'new name';
      const result = updateName(fruitsData, newName);
      expect(result.name).toBe(newName);
    });
  });

  describe('updateCodes', () => {
    it('Updates the contents of the code list', () => {
      const newCodes: CodeList = [
        { value: 'apple', label: { nb: 'Eple', en: 'Apple' } },
        { value: 'pear', label: { nb: 'Pære', en: 'Pear' } },
      ];
      const result = updateCodes(fruitsData, newCodes);
      expect(result.codes).toBe(newCodes);
    });
  });
});
