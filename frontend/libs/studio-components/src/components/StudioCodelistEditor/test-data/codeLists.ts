import type { CodeList } from '../types/CodeList';
import type { CodeListItem } from '../types/CodeListItem';

export const emptyCodeList: CodeList = [];

const item1: CodeListItem = {
  description: 'Test 1 description',
  helpText: 'Test 1 help text',
  label: 'Test 1',
  value: 'test1',
};

const item2: CodeListItem = {
  description: 'Test 2 description',
  helpText: 'Test 2 help text',
  label: 'Test 2',
  value: 'test2',
};

const item3: CodeListItem = {
  description: 'Test 3 description',
  helpText: 'Test 3 help text',
  label: 'Test 3',
  value: 'test3',
};

export const codeListWithStrings: CodeList = [item1, item2, item3];

const duplicatedValue = 'duplicate';
export const codeListWithDuplicatedValues: CodeList = [
  { ...item1, value: duplicatedValue },
  { ...item2, value: duplicatedValue },
  item3,
];

export const codeListWithSingleNumber: CodeList = [
  {
    value: 3.14,
    label: 'Pi',
  },
  {
    value: '42',
    label: 'Forty two',
  },
  {
    value: '100',
    label: 'One hundred',
  },
];

export const codeListWithNumbers: CodeList = [
  {
    value: 3.14,
    label: 'Pi',
  },
  {
    value: 42,
    label: 'Forty two',
  },
  {
    value: 100,
    label: 'One hundred',
  },
];

export const codeListWithSingleBoolean: CodeList = [
  {
    value: true,
    label: 'Yes',
  },
  {
    value: 'false',
    label: 'No',
  },
];

export const codeListWithMixedCaseBooleanString: CodeList = [
  {
    value: true,
    label: 'Yes',
  },
  {
    value: 'fAlSe',
    label: 'No',
  },
];

export const codeListWithBooleans: CodeList = [
  {
    value: true,
    label: 'Yes',
  },
  {
    value: false,
    label: 'No',
  },
];

export const codeListWithMixedValues: CodeList = [
  {
    value: true,
    label: 'Yes',
  },
  {
    value: 0,
    label: 'No',
  },
];

export const CodeListWithNumbers1and0: CodeList = [
  {
    value: 1,
    label: 'Yes',
  },
  {
    value: 0,
    label: 'No',
  },
];

export const codeListWithNumbersAndEmptyStringValue: CodeList = [
  {
    value: 3.14,
    label: 'Pi',
  },
  {
    value: 42,
    label: 'Forty two',
  },
  {
    value: '',
    label: '',
  },
];
