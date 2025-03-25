import type { CodeListItem } from '../types/CodeListItem';
import type { CodeList } from '../types/CodeList';

const item1: CodeListItem = {
  description: 'Positive number',
  helpText: 'Test 1 help text',
  label: 'Test 1',
  value: 1,
};

const item2: CodeListItem = {
  description: 'Decimal',
  helpText: 'Test 2 help text',
  label: 'Test 2',
  value: 3.14,
};

const item3: CodeListItem = {
  description: 'Negative number',
  helpText: 'Test 3 help text',
  label: 'Test 3',
  value: -1,
};

export const codeListWithNumbers: CodeList = [item1, item2, item3];
