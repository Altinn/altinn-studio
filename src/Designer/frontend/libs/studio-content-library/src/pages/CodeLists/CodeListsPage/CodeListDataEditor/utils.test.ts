import { fileState, updateCodes, updateName } from './utils';
import type { FileState } from './utils';
import { coloursFile, fruitsFile } from '../test-data/codeLists';
import type { CodeList } from '../../../../types/CodeList';
import { ObjectUtils } from '@studio/pure-functions';
import type { CodeListFileWithProblem } from '../../../../types/CodeListFile';

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

  describe('fileState', () => {
    it('Returns "added" when savedFile is null', () => {
      expect(fileState(fruitsFile, null)).toBe('added' satisfies FileState);
    });

    it('Returns "changed" when savedFile is different from currentFile', () => {
      expect(fileState(fruitsFile, coloursFile)).toBe('changed' satisfies FileState);
    });

    it('Returns "saved" when savedFile and currentFile are equal', () => {
      const fruitsFileCopy = ObjectUtils.deepCopy(fruitsFile);
      expect(fileState(fruitsFile, fruitsFileCopy)).toBe('saved' satisfies FileState);
    });

    it('Returns "withProblem" when there is a problem in savedFile', () => {
      const fileWithProblem: CodeListFileWithProblem = {
        name: fruitsFile.name,
        problem: {},
      };
      expect(fileState(fruitsFile, fileWithProblem)).toBe('withProblem' satisfies FileState);
    });

    it('Returns "withProblem" when there is a problem in currentFile', () => {
      const fileWithProblem: CodeListFileWithProblem = {
        name: fruitsFile.name,
        problem: {},
      };
      expect(fileState(fileWithProblem, fruitsFile)).toBe('withProblem' satisfies FileState);
    });
  });
});
