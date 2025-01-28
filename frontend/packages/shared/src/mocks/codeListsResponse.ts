import type { CodeListsResponse } from '../types/api/CodeListsResponse';
import type { CodeListData } from '@studio/content-library';

const codeList1: CodeListData = {
  title: 'optionList1',
  data: [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
  ],
};

const codeList2: CodeListData = {
  title: 'optionList2',
  data: [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ],
};

const codeListWithError: CodeListData = {
  title: 'optionListWithError',
  hasError: true,
};

export const codeListsResponse: CodeListsResponse = [codeList1, codeList2, codeListWithError];
