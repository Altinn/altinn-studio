import type { CodeList } from 'app-shared/types/CodeList';
import type { CodeListData } from 'app-shared/types/CodeListData';
import {
  label1ResourceNb,
  label2ResourceNb,
  label3ResourceNb,
  label4ResourceNb,
} from './textResources';

const codeList1: CodeList = [
  {
    value: 'item1',
    label: label1ResourceNb.id,
  },
  {
    value: 'item2',
    label: label2ResourceNb.id,
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
    label: label3ResourceNb.id,
  },
  {
    value: 'itemB',
    label: label4ResourceNb.id,
  },
];
const codeList2Name = 'codeList2';
export const codeList2Data: CodeListData = {
  title: codeList2Name,
  data: codeList2,
};

export const codeListDataList = [codeList1Data, codeList2Data];
