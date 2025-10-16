import { areThereCodeListErrors, findCodeListErrors, isCodeListValid } from './validation';
import type { CodeListWithTextResources } from '../types/CodeListWithTextResources';
import type { ValueErrorMap } from '../types/ValueErrorMap';

const validCodeList: CodeListWithTextResources = [
  {
    value: 'value1',
    label: 'Label 1',
  },
  {
    value: 'value2',
    label: 'Label 2',
  },
];
const codeListWithDuplicateValues: CodeListWithTextResources = [
  {
    value: 'value1',
    label: 'Label 1',
  },
  {
    value: 'value1',
    label: 'Label 2',
  },
];
const codeListWithMultipleTypes: CodeListWithTextResources = [
  {
    value: 'value1',
    label: 'Label 1',
  },
  {
    value: 2,
    label: 'Label 2',
  },
];
const codeListWithNullValue: CodeListWithTextResources = [
  {
    value: null,
    label: 'Label 1',
  },
  {
    value: 'value2',
    label: 'Label 2',
  },
];

describe('validation', () => {
  describe('isCodeListValid', () => {
    it('Returns true when there are no errors', () => {
      expect(isCodeListValid(validCodeList)).toBe(true);
    });

    it('Returns false when there are errors', () => {
      expect(isCodeListValid(codeListWithDuplicateValues)).toBe(false);
    });
  });

  describe('findCodeListErrors', () => {
    it('Returns a corresponding array with null values only when there are no errors', () => {
      const errors = findCodeListErrors(validCodeList);
      expect(errors).toEqual([null, null] satisfies ValueErrorMap);
    });

    it('Returns an array with code word "duplicateValue" corresponding to duplicate values', () => {
      const errors = findCodeListErrors(codeListWithDuplicateValues);
      expect(errors).toEqual(['duplicateValue', 'duplicateValue'] satisfies ValueErrorMap);
    });

    it('Returns an array with code word "multipleTypes" corresponding to multiple values', () => {
      const errors = findCodeListErrors(codeListWithMultipleTypes);
      expect(errors).toEqual(['multipleTypes', 'multipleTypes'] satisfies ValueErrorMap);
    });

    it('Returns an array with code word "nullValue" corresponding to null values', () => {
      const errors = findCodeListErrors(codeListWithNullValue);
      expect(errors).toEqual(['nullValue', 'multipleTypes'] satisfies ValueErrorMap);
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

    it('Returns true when the error map contains at least one "multipleTypes" error', () => {
      const errorMap: ValueErrorMap = ['multipleTypes', null];
      expect(areThereCodeListErrors(errorMap)).toBe(true);
    });

    it('Returns true when the error map contains at least one "nullValue" error', () => {
      const errorMap: ValueErrorMap = ['nullValue', null];
      expect(areThereCodeListErrors(errorMap)).toBe(true);
    });
  });
});
