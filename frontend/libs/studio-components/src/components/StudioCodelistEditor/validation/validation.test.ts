import { areThereCodeListErrors, findCodeListErrors, isCodeListValid } from './validation';
import type { CodeList } from '../types/CodeList';
import type { ValueErrorMap } from '../types/ValueErrorMap';

describe('validation', () => {
  describe('isCodeListValid', () => {
    it('Returns true when there are no errors', () => {
      const codeList: CodeList = [
        {
          value: 'value1',
          label: 'Label 1',
        },
        {
          value: 'value2',
          label: 'Label 2',
        },
      ];
      expect(isCodeListValid(codeList)).toBe(true);
    });

    it('Returns false when there are errors', () => {
      const codeListWithEmptyValue: CodeList = [
        {
          value: 'value2',
          label: 'Label 1',
        },
        {
          value: 'value2',
          label: 'Label 2',
        },
      ];
      expect(isCodeListValid(codeListWithEmptyValue)).toBe(false);
    });
  });

  describe('findCodeListErrors', () => {
    it('Returns a corresponding array with null values only when there are no errors', () => {
      const codeList: CodeList = [
        {
          value: 'value1',
          label: 'Label 1',
        },
        {
          value: 'value2',
          label: 'Label 2',
        },
      ];
      const errors = findCodeListErrors(codeList);
      expect(errors).toEqual([null, null] satisfies ValueErrorMap);
    });

    it('Returns an array with code word "duplicateValue" corresponding to duplicate values', () => {
      const codeList: CodeList = [
        {
          value: 'value1',
          label: 'label1',
        },
        {
          value: 'value1',
          label: 'label2',
        },
      ];
      const errors = findCodeListErrors(codeList);
      expect(errors).toEqual(['duplicateValue', 'duplicateValue'] satisfies ValueErrorMap);
    });
  });

  describe('areThereCodeListErrors', () => {
    it('Returns false when the error map consists of null values only', () => {
      const errorMap: ValueErrorMap = [null, null];
      expect(areThereCodeListErrors(errorMap)).toBe(false);
    });

    it('Returns false when the error map is empty', () => {
      const errorMap: ValueErrorMap = [];
      expect(areThereCodeListErrors(errorMap)).toBe(false);
    });

    it('Returns true when the error map contains at least one "duplicateValue" error', () => {
      const errorMap: ValueErrorMap = ['duplicateValue', null];
      expect(areThereCodeListErrors(errorMap)).toBe(true);
    });
  });
});
