import { updateCodes, updateName } from './utils';
import { fruitsFile } from '../test-data/codeLists';
import type { CodeList } from '../../../../types/CodeList';

describe('CodeListDataEditor utils', () => {
  describe('updateName', () => {
    it('Updates the name of the code list', () => {
      const newName = 'new name';
      const result = updateName(fruitsFile, newName);
      expect(result.name).toBe(newName + '.json');
    });
  });

  describe('updateCodes', () => {
    it('Updates the contents of the code list', () => {
      const newCodes: CodeList = [
        { value: 'apple', label: { nb: 'Eple', en: 'Apple' } },
        { value: 'pear', label: { nb: 'Pære', en: 'Pear' } },
      ];
      const result = updateCodes(fruitsFile, newCodes);
      expect(result.content).toBe(JSON.stringify(newCodes));
    });
  });
});
