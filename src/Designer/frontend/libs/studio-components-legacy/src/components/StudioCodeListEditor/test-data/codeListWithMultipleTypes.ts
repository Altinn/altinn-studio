import type { CodeListItem } from '../types/CodeListItem';
import type { CodeList } from '../types/CodeList';
import { codeListWithStrings } from './codeListWithStrings';

const item1: CodeListItem = {
  ...codeListWithStrings[0],
  value: 1,
};

const item2: CodeListItem = {
  ...codeListWithStrings[1],
  value: true,
};

const item3: CodeListItem = {
  ...codeListWithStrings[2],
  value: 'test-value',
};

export const codeListWithMultipleTypes: CodeList = [item1, item2, item3];
