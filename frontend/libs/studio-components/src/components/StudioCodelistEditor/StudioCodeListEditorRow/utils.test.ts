import type { CodeListItem } from '../types/CodeListItem';
import { ObjectUtils } from '@studio/pure-functions';
import { changeDescription, changeHelpText, changeLabel, changeValue, coerceValue } from './utils';
import { CodeListType } from '../types/CodeListType';

// Test data:
const testItem: CodeListItem = {
  label: 'Test 1',
  value: 'test1',
  description: 'Test 1 description',
};
const createTestItem = (): CodeListItem => ObjectUtils.deepCopy(testItem);

describe('StudioCodeListEditorRow utils', () => {
  describe('changeLabel', () => {
    it('Changes the label of the code list item', () => {
      const item = createTestItem();
      const newLabel = 'Updated label';
      const updatedItem = changeLabel(item, newLabel);
      expect(updatedItem.label).toBe(newLabel);
    });

    it('Returns a new instance', () => {
      const item = createTestItem();
      const updatedItem = changeLabel(item, 'Updated label');
      expect(updatedItem).not.toBe(item);
    });
  });

  describe('changeDescription', () => {
    it('Changes the description of the code list item', () => {
      const item = createTestItem();
      const newDescription = 'Updated description';
      const updatedItem = changeDescription(item, newDescription);
      expect(updatedItem.description).toBe(newDescription);
    });

    it('Returns a new instance', () => {
      const item = createTestItem();
      const updatedItem = changeDescription(item, 'Updated description');
      expect(updatedItem).not.toBe(item);
    });
  });

  describe('changeValue', () => {
    it('Changes the value of the code list item', () => {
      const item = createTestItem();
      const newValue = 'updatedValue';
      const updatedItem = changeValue(item, newValue);
      expect(updatedItem.value).toBe(newValue);
    });

    it('Returns a new instance', () => {
      const item = createTestItem();
      const updatedItem = changeValue(item, 'updatedValue');
      expect(updatedItem).not.toBe(item);
    });
  });

  describe('changeHelpText', () => {
    it('Changes the help text of the code list item', () => {
      const item = createTestItem();
      const newHelpText = 'Updated help text';
      const updatedItem = changeHelpText(item, newHelpText);
      expect(updatedItem.helpText).toBe(newHelpText);
    });

    it('Returns a new instance', () => {
      const item = createTestItem();
      const updatedItem = changeHelpText(item, 'Updated help text');
      expect(updatedItem).not.toBe(item);
    });
  });

  describe('coerceValue', () => {
    it('Should coerce value to string, when codeListType is string', () => {
      const codeListType = CodeListType.String;
      const updatedValue = '123';
      expect(coerceValue(updatedValue, codeListType)).toBe('123');
    });

    it('Should coerce value to number, when codeListType is number', () => {
      const codeListType = CodeListType.Number;
      const value = '123';
      expect(coerceValue(value, codeListType)).toBe(123);
    });

    it('Should coerce value to NaN, when value is not number and codeListType is number', () => {
      const codeListType = CodeListType.Number;
      const value = 'test-string';
      expect(coerceValue(value, codeListType)).toBe(NaN);
    });

    it('Should coerce value to true, when string equals true and codeListType is boolean', () => {
      const codeListType = CodeListType.Boolean;
      const lowerCaseValue = 'true';
      expect(coerceValue(lowerCaseValue, codeListType)).toBe(true);

      const mixedCaseValue = 'True';
      expect(coerceValue(mixedCaseValue, codeListType)).toBe(true);
    });

    it('Should coerce value to false, when string does not equal true and codeListType is boolean', () => {
      const codeListType = CodeListType.Boolean;
      const emptyValue = '';
      expect(coerceValue(emptyValue, codeListType)).toBe(false);

      const falseValue = 'false';
      expect(coerceValue(falseValue, codeListType)).toBe(false);

      const randomValue = 'abc123øæå';
      expect(coerceValue(randomValue, codeListType)).toBe(false);
    });
  });
});
