import type { CodeListItem } from '../types/CodeListItem';
import type { CodeList } from '../types/CodeList';

const item1: CodeListItem = {
  description: 'Test 1 description',
  helpText: 'Test 1 help text',
  label: 'Test 1',
  value: true,
};

const item2: CodeListItem = {
  description: 'Test 2 description',
  helpText: 'Test 2 help text',
  label: 'Test 2',
  value: false,
};

export const codeListWithBooleanValues: CodeList = [item1, item2];
