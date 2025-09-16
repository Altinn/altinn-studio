import type { CodeList } from './types/CodeList';
import {
  addNewCodeListItem,
  changeCodeListItem,
  isCodeListEmpty,
  removeCodeListItem,
  updateCodeText,
} from './utils';
import type { UpdateCodeTextArgs } from './utils';
import { ObjectUtils } from '@studio/pure-functions';
import { codeList } from './test-data/codeList';
import { CodeListItemTextProperty } from './enums/CodeListItemTextProperty';
import type { CodeListItem } from './types/CodeListItem';

// Test data:
const testCodeList: CodeList = [
  {
    value: 'test1',
    label: {
      en: 'Label 1',
      nb: 'Ledetekst 1',
    },
    description: {
      en: 'Description 1',
      nb: 'Beskrivelse 1',
    },
  },
  {
    value: 'test2',
    label: {
      en: 'Label 2',
      nb: 'Ledetekst 2',
    },
    description: {
      en: 'Description 2',
      nb: 'Beskrivelse 2',
    },
  },
];
const createTestCodeList = (): CodeList => ObjectUtils.deepCopy(testCodeList);

describe('StudioCodelistEditor utils', () => {
  describe('addNewCodeListItem', () => {
    it('Adds an empty string item when the code list consists of strings', () => {
      const updatedCodeList = addNewCodeListItem(codeList);
      expect(updatedCodeList).toEqual([...codeList, { value: '', label: {} }]);
    });

    it('Returns a new instance', () => {
      const codeList = createTestCodeList();
      const updatedCodeList = addNewCodeListItem(codeList);
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
    const updatedItem: CodeListItem = {
      label: {
        en: 'Updated label',
        nb: 'Oppdatert ledetekst',
      },
      value: 'updatedValue',
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

  describe('updateCodeText', () => {
    const codeItemIndex = 1;
    const newValue = 'new text';
    const language = 'nb';

    it.each(Object.values(CodeListItemTextProperty))(
      'Returns updated codeList when the %s property is updated',
      (property: CodeListItemTextProperty) => {
        const expectedCodeList = [...codeList];
        expectedCodeList[codeItemIndex][property]![language] = newValue;
        const updateArgs: UpdateCodeTextArgs = { property, codeItemIndex, language, newValue };

        const result = updateCodeText(codeList, updateArgs);

        expect(result).toEqual(expectedCodeList);
      },
    );
  });
});
