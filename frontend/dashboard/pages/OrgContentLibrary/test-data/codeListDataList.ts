import type { CodeList } from 'app-shared/types/CodeList';
import type { CodeListData } from 'app-shared/types/CodeListData';

const codeList1: CodeList = [
  {
    value: 'item1',
    label: 'item1-text-key',
  },
  {
    value: 'item2',
    label: 'item2-text-key',
  },
];
const codeList1Name = 'codeList1';
export const codeList1Data: CodeListData = {
  title: codeList1Name,
  data: codeList1,
};

const codeList2: CodeList = [
  {
    value: 'itemA',
    label: 'itemA-text-key',
  },
  {
    value: 'itemB',
    label: 'itemB-text-key',
  },
];
const codeList2Name = 'codeList2';
export const codeList2Data: CodeListData = {
  title: codeList2Name,
  data: codeList2,
};

export const codeListDataList = [codeList1Data, codeList2Data];
