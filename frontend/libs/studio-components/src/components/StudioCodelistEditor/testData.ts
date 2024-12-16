import type { CodeList } from './types/CodeList';

export const emptyCodeList: CodeList = [];

export const codeListWithStrings: CodeList = [
  {
    label: 'Test 1',
    value: 'test1',
    description: 'Test 1 description',
    helpText: 'Test 1 help text',
  },
  {
    label: 'Test 2',
    value: 'test2',
    description: 'Test 2 description',
    helpText: 'Test 2 help text',
  },
  {
    label: 'Test 3',
    value: 'test3',
    description: 'Test 3 description',
    helpText: 'Test 3 help text',
  },
];

const duplicatedValue = 'duplicate';
export const codeListWithDuplicatedValues: CodeList = [
  {
    label: 'Test 1',
    value: duplicatedValue,
    description: 'Test 1 description',
    helpText: 'Test 1 help text',
  },
  {
    label: 'Test 2',
    value: duplicatedValue,
    description: 'Test 2 description',
    helpText: 'Test 2 help text',
  },
  {
    label: 'Test 3',
    value: 'unique',
    description: 'Test 3 description',
    helpText: 'Test 3 help text',
  },
];

export const codeListWithStringifiedNumbers: CodeList = [
  {
    value: '3.14',
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

export const codeListWithStringifiedBooleans: CodeList = [
  {
    value: 'true',
    label: 'Yes',
  },
  {
    value: 'false',
    label: 'No',
  },
];

export const codeListWithStringifiedMixedCaseBooleans: CodeList = [
  {
    value: 'TRUE',
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

export const codeListWithStringifiedMixedValues: CodeList = [
  {
    value: 'true',
    label: 'Yes',
  },
  {
    value: '0',
    label: 'No',
  },
];

export const codeListWithEmptyStringValue: CodeList = [
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
