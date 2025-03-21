import type { CodeListItem } from '../types/CodeListItem';
import type { CodeList } from '../types/CodeList';

const item1: CodeListItem = {
  description: 'number',
  helpText: 'Test 1 help text',
  label: 'Test 1',
  value: 1,
};

const item2: CodeListItem = {
  description: 'boolean',
  helpText: 'Test 2 help text',
  label: 'Test 2',
  value: true,
};

const item3: CodeListItem = {
  description: 'string',
  helpText: 'Test 3 help text',
  label: 'Test 3',
  value: 'test-value',
};

export const codeListWithMultipleTypes: CodeList = [item1, item2, item3];
