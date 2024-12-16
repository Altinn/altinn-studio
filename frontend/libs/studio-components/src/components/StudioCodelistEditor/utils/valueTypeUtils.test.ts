import type { CodeList } from '../types/CodeList';
import { inferValueType, updateCodeListValueType } from './valueTypeUtils';
import {
  codeListWithMixedValues,
  codeListWithStringifiedMixedValues,
  codeListWithBooleans,
  codeListWithEmptyStringValue,
  codeListWithNumbers,
  codeListWithStringifiedBooleans,
  codeListWithStringifiedMixedCaseBooleans,
  codeListWithStringifiedNumbers,
  codeListWithStrings,
  emptyCodeList,
} from '../testData';

describe('updateCodeListValueType', () => {
  it('should keep string values as strings', () => {
    const codeList: CodeList = codeListWithStrings;
    updateCodeListValueType(codeList);
    expect(codeList).toEqual(codeListWithStrings);
  });

  it('should infer and coerce values to number if all fit number', () => {
    const codeList: CodeList = codeListWithStringifiedNumbers;
    updateCodeListValueType(codeList);
    expect(codeList).toEqual(codeListWithNumbers);
  });

  it('should infer and coerce values to boolean if all fit boolean', () => {
    const codeList: CodeList = codeListWithStringifiedBooleans;
    updateCodeListValueType(codeList);
    expect(codeList).toEqual(codeListWithBooleans);
  });

  it('should infer and coerce values as string if not all fit number or boolean', () => {
    const codeList: CodeList = codeListWithMixedValues;
    updateCodeListValueType(codeList);
    expect(codeList).toEqual(codeListWithStringifiedMixedValues);
  });

  it('should handle mixed case booleans when inferring boolean type', () => {
    const codeList: CodeList = codeListWithStringifiedMixedCaseBooleans;
    updateCodeListValueType(codeList);
    expect(codeList).toEqual(codeListWithBooleans);
  });

  it('should infer empty values to string', () => {
    const codeList = codeListWithEmptyStringValue;
    updateCodeListValueType(codeList);
    expect(codeList).toEqual(codeListWithEmptyStringValue);
  });
});

describe('inferValueType', () => {
  it('should return "undefined" for an empty code list', () => {
    expect(inferValueType(emptyCodeList)).toBe('undefined');
  });

  it('should return "string" when some values are strings that cannot be inferred as number or boolean', () => {
    expect(inferValueType(codeListWithStrings)).toBe('string');
  });

  it('should return "number" when all values are numeric strings', () => {
    expect(inferValueType(codeListWithStringifiedNumbers)).toBe('number');
  });

  it('should return "boolean" when all values are lower case boolean strings', () => {
    expect(inferValueType(codeListWithStringifiedBooleans)).toBe('boolean');
  });

  it('should return "boolean" when values are booleans in mixed case strings', () => {
    expect(inferValueType(codeListWithStringifiedMixedCaseBooleans)).toBe('boolean');
  });

  it('should return "string" if codelist contains both numeric and boolean strings', () => {
    expect(inferValueType(codeListWithStringifiedMixedValues)).toBe('string');
  });

  it('should return "string" if there is an empty string value', () => {
    expect(inferValueType(codeListWithEmptyStringValue)).toBe('string');
  });
});
