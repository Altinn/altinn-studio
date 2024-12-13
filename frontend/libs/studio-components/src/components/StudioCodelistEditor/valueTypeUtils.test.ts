import type { CodeList } from './types/CodeList';
import { coerceValues, inferValueType, updateCodeListValueType } from './valueTypeUtils';

const emptyCodeList: CodeList = [];

const codeListWithStrings: CodeList = [
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

const codeListWithStringifiedNumbers: CodeList = [
  {
    value: '42',
    label: 'Forty two',
  },
  {
    value: '3.14',
    label: 'Pi',
  },
  {
    value: '100',
    label: 'One hundred',
  },
];

const codeListWithNumbers: CodeList = [
  {
    value: 42,
    label: 'Forty two',
  },
  {
    value: 3.14,
    label: 'Pi',
  },
  {
    value: 100,
    label: 'One hundred',
  },
];

const codeListWithStringifiedBooleans: CodeList = [
  {
    value: 'true',
    label: 'Yes',
  },
  {
    value: 'false',
    label: 'No',
  },
];

const codeListWithStringifiedMixedCaseBooleans: CodeList = [
  {
    value: 'TRUE',
    label: 'Yes',
  },
  {
    value: 'fAlSe',
    label: 'No',
  },
];

const codeListWithBooleans: CodeList = [
  {
    value: true,
    label: 'Yes',
  },
  {
    value: false,
    label: 'No',
  },
];

const codeListMixedValues: CodeList = [
  {
    value: true,
    label: 'Yes',
  },
  {
    value: 0,
    label: 'No',
  },
];

const codeListStringifiedMixedValues: CodeList = [
  {
    value: 'true',
    label: 'Yes',
  },
  {
    value: '0',
    label: 'No',
  },
];

const codeListWithEmptyStringValue: CodeList = [
  {
    value: '42',
    label: 'Forty two',
  },
  {
    value: '',
    label: 'Pi',
  },
  {
    value: '100',
    label: 'One hundred',
  },
];

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
    const codeList: CodeList = codeListMixedValues;
    updateCodeListValueType(codeList);
    expect(codeList).toEqual(codeListStringifiedMixedValues);
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
    expect(inferValueType(codeListStringifiedMixedValues)).toBe('string');
  });

  it('should return "string" if there is an empty string value', () => {
    expect(inferValueType(codeListWithEmptyStringValue)).toBe('string');
  });
});

describe('coerceValues', () => {
  it('should coerce string values to string', () => {
    const codeList: CodeList = codeListWithStrings;
    coerceValues(codeList, 'string');
    expect(codeList).toEqual(codeListWithStrings);
  });

  it('should coerce number values to number', () => {
    const codeList: CodeList = codeListWithStringifiedNumbers;
    coerceValues(codeList, 'number');
    expect(codeList).toEqual(codeListWithNumbers);
  });

  it('should coerce boolean values to boolean', () => {
    const codeList: CodeList = codeListWithStringifiedBooleans;
    coerceValues(codeList, 'boolean');
    expect(codeList).toEqual(codeListWithBooleans);
  });

  it('should coerce mixed values to string', () => {
    const codeList: CodeList = codeListMixedValues;
    coerceValues(codeList, 'string');
    expect(codeList).toEqual(codeListStringifiedMixedValues);
  });
});
