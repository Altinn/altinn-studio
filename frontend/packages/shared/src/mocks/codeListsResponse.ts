import type { CodeListsResponse } from '../types/api/CodeListsResponse';
import type { CodeListData } from '@studio/content-library';

const codeList1: CodeListData = {
  title: 'codeList1',
  data: [
    { label: 'Item 1', value: 'item1' },
    { label: 'Item 2', value: 'item2' },
  ],
};

const codeList2: CodeListData = {
  title: 'codeList2',
  data: [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ],
};

const codeListWithError: CodeListData = {
  title: 'codeListWithError',
  hasError: true,
};

export const codeListsResponse: CodeListsResponse = [codeList1, codeList2, codeListWithError];
