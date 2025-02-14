import type { CodeList } from './types/CodeList';
import {
  addNewCodeListItem,
  changeCodeListItem,
  emptyBooleanItem,
  emptyNumberItem,
  emptyStringItem,
  getTypeOfLastValue,
  isCodeListEmpty,
  removeCodeListItem,
} from './utils';
import { ObjectUtils } from '@studio/pure-functions';

// Test data:
const testCodeList: CodeList = [
  {
    label: 'Test 1',
    value: 'test1',
    description: 'Test 1 description',
  },
  {
    label: 'Test 2',
    value: 'test2',
    description: 'Test 2 description',
  },
];
const createTestCodeList = (): CodeList => ObjectUtils.deepCopy(testCodeList);

describe('StudioCodelistEditor utils', () => {
  describe('addNewCodeListItem', () => {
    it('Adds an empty string when valueType is string', () => {
      const codeList: CodeList = [{ value: 'test-value', label: 'stringItem' }];
      const updatedCodeList = addNewCodeListItem(codeList, 'string');
      expect(updatedCodeList).toEqual([...codeList, emptyStringItem]);
    });

    it('Adds an empty number item when valueType is number', () => {
      const codeList: CodeList = [{ value: 1, label: 'numberItem' }];
      const updatedCodeList = addNewCodeListItem(codeList, 'number');
      expect(updatedCodeList).toEqual([...codeList, emptyNumberItem]);
    });

    it('Adds an empty boolean item when valueType is boolean', () => {
      const codeList: CodeList = [{ value: true, label: 'booleanItem' }];
      const updatedCodeList = addNewCodeListItem(codeList, 'boolean');
      expect(updatedCodeList).toEqual([...codeList, emptyBooleanItem]);
    });

    it('Returns a new instance', () => {
      const codeList = createTestCodeList();
      const updatedCodeList = addNewCodeListItem(codeList);
      expect(updatedCodeList).not.toBe(codeList);
    });
  });

  describe('getTypeOfLastValue', () => {
    it('should throw an error when the code list is empty', () => {
      const emptyCodeList: CodeList = [];
      expect(() => getTypeOfLastValue(emptyCodeList)).toThrow();
    });
  });

  describe('removeCodeListItem', () => {
    it('Removes the code list item at the given index', () => {
      const codeList = createTestCodeList();
      const updatedCodeList = removeCodeListItem(codeList, 1);
      expect(updatedCodeList).toEqual([codeList[0]]);
    });

    it('Returns a new instance', () => {
      const codeList = createTestCodeList();
      const updatedCodeList = removeCodeListItem(codeList, 1);
      expect(updatedCodeList).not.toBe(codeList);
    });
  });

  describe('changeCodeListItem', () => {
    const updatedItem = {
      label: 'Updated label',
      value: 'updatedValue',
      description: 'Updated description',
    };

    it('Replaces the code list item at the given index', () => {
      const codeList = createTestCodeList();
      const updatedCodeList = changeCodeListItem(codeList, 1, updatedItem);
      expect(updatedCodeList).toEqual([codeList[0], updatedItem]);
    });

    it('Returns a new instance', () => {
      const codeList = createTestCodeList();
      const updatedCodeList = changeCodeListItem(codeList, 1, updatedItem);
      expect(updatedCodeList).not.toBe(codeList);
    });
  });

  describe('isCodeListEmpty', () => {
    it('Returns true when the code list is empty', () => {
      expect(isCodeListEmpty([])).toBe(true);
    });

    it('Returns false when the code list is not empty', () => {
      const codeList = createTestCodeList();
      expect(isCodeListEmpty(codeList)).toBe(false);
    });
  });
});
