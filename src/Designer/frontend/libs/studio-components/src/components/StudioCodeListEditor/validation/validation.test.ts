import { areThereCodeListErrors, findCodeListErrors, isCodeListValid } from './validation';
import type { CodeList } from '../types/CodeList';
import type { ValueErrorMap } from '../types/ValueErrorMap';

const validCodeList: CodeList = [
  {
    value: 'value1',
    label: { nb: 'Ledetekst 1' },
  },
  {
    value: 'value2',
    label: { nb: 'Ledetekst 2' },
  },
];
const codeListWithDuplicateValues: CodeList = [
  {
    value: 'value1',
    label: { nb: 'Ledetekst 1' },
  },
  {
    value: 'value1',
    label: { nb: 'Ledetekst 2' },
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
