import type { CodeListItem } from '../types/CodeListItem';
import type { CodeList } from '../types/CodeList';
import { codeListWithStrings } from './codeListWithStrings';

const item1: CodeListItem = {
  ...codeListWithStrings[0],
  value: true,
};

const item2: CodeListItem = {
  ...codeListWithStrings[1],
  value: false,
};

export const codeListWithBooleans: CodeList = [item1, item2];
