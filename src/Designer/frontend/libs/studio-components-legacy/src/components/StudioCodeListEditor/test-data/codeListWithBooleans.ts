import type { CodeListItem } from '../types/CodeListItem';
import type { CodeListWithTextResources } from '../types/CodeListWithTextResources';
import { codeListWithStrings } from './codeListWithStrings';

const item1: CodeListItem = {
  ...codeListWithStrings[0],
  value: true,
};

const item2: CodeListItem = {
  ...codeListWithStrings[1],
  value: false,
};

export const codeListWithBooleans: CodeListWithTextResources = [item1, item2];
