import type { CodeListWithTextResources } from '../types/CodeListWithTextResources';
import type { CodeListItem } from '../types/CodeListItem';

const item1: CodeListItem = {
  label: '',
  value: 'test1',
};

const item2: CodeListItem = {
  label: '',
  value: 'test2',
};

const item3: CodeListItem = {
  label: '',
  value: 'test3',
};

export const codeListWithoutTextResources: CodeListWithTextResources = [item1, item2, item3];
