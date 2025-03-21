import type { CodeList } from '../types/CodeList';
import type { CodeListItem } from '../types/CodeListItem';

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

export const codeListWithoutTextResources: CodeList = [item1, item2, item3];
