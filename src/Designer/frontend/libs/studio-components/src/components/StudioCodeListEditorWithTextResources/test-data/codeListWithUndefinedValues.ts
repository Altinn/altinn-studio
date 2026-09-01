import type { CodeListItem } from '../types/CodeListItem';
import type { CodeListWithTextResources } from '../types/CodeListWithTextResources';

const item1: CodeListItem = {
  description: 'Undefined value 1',
  helpText: 'Test 1 help text',
  label: 'Test 1',
  value: undefined,
};

const item2: CodeListItem = {
  description: 'Undefined value 2',
  helpText: 'Test 2 help text',
  label: 'Test 2',
  value: undefined,
};

const item3: CodeListItem = {
  description: 'Undefined value 3',
  helpText: 'Test 3 help text',
  label: 'Test 3',
  value: undefined,
};

export const codeListWithUndefinedValues: CodeListWithTextResources = [item1, item2, item3];
