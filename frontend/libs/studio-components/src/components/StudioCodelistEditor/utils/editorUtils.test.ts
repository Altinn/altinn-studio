import type { CodeList } from '../types/CodeList';
import {
  addEmptyCodeListItem,
  changeCodeListItem,
  isCodeListEmpty,
  removeCodeListItem,
} from './editorUtils';
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
  describe('addEmptyCodeListItem', () => {
    it('Adds an empty item to the code list', () => {
      const codeList = createTestCodeList();
      const updatedCodeList = addEmptyCodeListItem(codeList);
      expect(updatedCodeList).toEqual([
        ...codeList,
        {
          label: '',
          value: '',
        },
      ]);
    });

    it('Returns a new instance', () => {
      const codeList = createTestCodeList();
      const updatedCodeList = addEmptyCodeListItem(codeList);
      expect(updatedCodeList).not.toBe(codeList);
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
