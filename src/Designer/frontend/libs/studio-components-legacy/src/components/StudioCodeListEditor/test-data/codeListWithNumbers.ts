import type { CodeListItem } from '../types/CodeListItem';
import type { CodeList } from '../types/CodeList';
import { codeListWithStrings } from './codeListWithStrings';

const item1: CodeListItem = {
  ...codeListWithStrings[0],
  value: 1,
};

const item2: CodeListItem = {
  ...codeListWithStrings[1],
  value: 3.14,
};

const item3: CodeListItem = {
  ...codeListWithStrings[2],
  value: -1,
};

export const codeListWithNumbers: CodeList = [item1, item2, item3];
