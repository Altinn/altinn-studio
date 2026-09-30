import type { CodeListWithTextResources } from './types/CodeListWithTextResources';
import {
  addNewCodeListItem,
  changeCodeListItem,
  emptyBooleanItem,
  emptyNumberItem,
  emptyStringItem,
  evaluateDefaultType,
  getTypeOfLastValue,
  isCodeLimitReached,
  isCodeListEmpty,
  removeCodeListItem,
  updateCodeList,
} from './utils';
import { ObjectUtils } from '@studio/pure-functions';
import { CodeListItemType } from './types/CodeListItemType';
import { codeListWithStrings } from './test-data/codeListWithStrings';
import { codeListWithNumbers } from './test-data/codeListWithNumbers';
import { codeListWithBooleans } from './test-data/codeListWithBooleans';
import { CodeListItemTextProperty } from './types/CodeListItemTextProperty';

// Test data:
const testCodeList: CodeListWithTextResources = [
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
const createTestCodeList = (): CodeListWithTextResources => ObjectUtils.deepCopy(testCodeList);

describe('StudioCodelistEditor utils', () => {
  describe('addNewCodeListItem', () => {
    it('Adds an empty string item when the code list consists of strings', () => {
      const updatedCodeList = addNewCodeListItem(codeListWithStrings, CodeListItemType.String);
      expect(updatedCodeList).toEqual([...codeListWithStrings, emptyStringItem]);
    });

    it('Adds an empty number item when valueType is number', () => {
      const updatedCodeList = addNewCodeListItem(codeListWithNumbers, CodeListItemType.Number);
      expect(updatedCodeList).toEqual([...codeListWithNumbers, emptyNumberItem]);
    });

    it('Adds an empty boolean item when valueType is boolean', () => {
      const updatedCodeList = addNewCodeListItem(codeListWithBooleans, CodeListItemType.Boolean);
      expect(updatedCodeList).toEqual([...codeListWithBooleans, emptyBooleanItem]);
    });

    it('Returns a new instance', () => {
      const codeList = createTestCodeList();
      const updatedCodeList = addNewCodeListItem(codeList, CodeListItemType.String);
      expect(updatedCodeList).not.toBe(codeList);
    });
  });

  describe('getTypeOfLastValue', () => {
    it('should throw an error when the code list is empty', () => {
      const emptyCodeList: CodeListWithTextResources = [];
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

  describe('evaluateDefaultType', () => {
    it('Returns "string" when the code list is empty', () => {
      expect(evaluateDefaultType([])).toBe(CodeListItemType.String);
    });

    it('Returns "string" when the code list consists of strings', () => {
      expect(evaluateDefaultType(codeListWithStrings)).toBe(CodeListItemType.String);
    });

    it('Returns "number" when the code list consists of numbers', () => {
      expect(evaluateDefaultType(codeListWithNumbers)).toBe(CodeListItemType.Number);
    });

    it('Returns "boolean" when the code list consists of booleans', () => {
      expect(evaluateDefaultType(codeListWithBooleans)).toBe(CodeListItemType.Boolean);
    });
  });

  describe('isCodeLimitReached', () => {
    it('Returns true when codeType is boolean and codeList has two elements', () => {
      expect(isCodeLimitReached(codeListWithBooleans, CodeListItemType.Boolean)).toBe(true);
    });

    it('Returns false when codeType is boolean and codeList has less than two elements', () => {
      const codeListWithSingleBoolean = [{ value: true, label: 'test' }];
      expect(isCodeLimitReached(codeListWithSingleBoolean, CodeListItemType.Boolean)).toBe(false);
    });

    it('Returns false when codeType is string', () => {
      expect(isCodeLimitReached(codeListWithStrings, CodeListItemType.String)).toBe(false);
    });

    it('Returns false when codeType is number', () => {
      expect(isCodeLimitReached(codeListWithNumbers, CodeListItemType.Number)).toBe(false);
    });
  });

  describe('updateCodeList', () => {
    const testRowNumber = 1;
    const newValue = 'new text';

    it.each(Object.values(CodeListItemTextProperty))(
      'Returns updated codeList when the %s property is updated',
      (property: CodeListItemTextProperty) => {
        const expectedCodeList = [...codeListWithStrings];
        expectedCodeList[testRowNumber][property] = newValue;

        expect(
          updateCodeList(codeListWithStrings, { property, codeItemIndex: testRowNumber, newValue }),
        ).toEqual(expectedCodeList);
      },
    );
  });
});
