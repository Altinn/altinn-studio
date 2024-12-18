import type { CodeList } from '../types/CodeList';
import { getValueType, updateCodeListValueType } from './valueTypeUtils';
import {
  codeListWithMixedValues,
  codeListWithBooleans,
  codeListWithNumbersAndEmptyStringValue,
  codeListWithNumbers,
  codeListWithSingleBoolean,
  codeListWithMixedCaseBooleanString,
  codeListWithSingleNumber,
  codeListWithStrings,
  emptyCodeList,
  CodeListWithNumbers1and0,
} from '../testData';

describe('updateCodeListValueType', () => {
  it('should keep string values as strings', () => {
    const codeList: CodeList = [...codeListWithStrings];
    updateCodeListValueType(codeList);
    expect(codeList).toEqual(codeListWithStrings);
  });

  it('should coerce all values to numbers, if at least one value has number type', () => {
    const codeList: CodeList = [...codeListWithSingleNumber];
    updateCodeListValueType(codeList);
    expect(codeList).toEqual(codeListWithNumbers);
  });

  it('should coerce all values to booleans, if at least one value has boolean type', () => {
    const codeList: CodeList = [...codeListWithSingleBoolean];
    updateCodeListValueType(codeList);
    expect(codeList).toEqual(codeListWithBooleans);
  });

  it('should handle mixed case strings when coercing to boolean', () => {
    const codeList: CodeList = [...codeListWithMixedCaseBooleanString];
    updateCodeListValueType(codeList);
    expect(codeList).toEqual(codeListWithBooleans);
  });

  it('should coerce all values to numbers, if code list has both numbers and booleans', () => {
    const codeList: CodeList = [...codeListWithMixedValues];
    updateCodeListValueType(codeList);
    expect(codeList).toEqual(CodeListWithNumbers1and0);
  });

  it('should not convert empty strings to number type', () => {
    const codeList = [...codeListWithNumbersAndEmptyStringValue];
    updateCodeListValueType(codeList);
    expect(codeList).toEqual(codeListWithNumbersAndEmptyStringValue);
  });
});

describe('getValueType', () => {
  it('should return "undefined" for an empty code list', () => {
    expect(getValueType(emptyCodeList)).toBe('undefined');
  });

  it('should return "string" when no values can be inferred as number or boolean', () => {
    expect(getValueType(codeListWithStrings)).toBe('string');
  });

  it('should return "number" when at least one value is a number', () => {
    expect(getValueType(codeListWithSingleNumber)).toBe('number');
  });

  it('should return "boolean" when at least one value is a boolean', () => {
    expect(getValueType(codeListWithSingleBoolean)).toBe('boolean');
  });

  it('should return "number" if code list contains both numbers and booleans', () => {
    expect(getValueType(codeListWithMixedValues)).toBe('number');
  });
});
