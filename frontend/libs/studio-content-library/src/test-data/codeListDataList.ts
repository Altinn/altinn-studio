import type { CodeList } from '../types/CodeList';
import type { CodeListData } from '../types/CodeListData';
import {
  description1ResourceNb,
  helpText1ResourceNb,
  label1ResourceNb,
  label4ResourceNb,
} from './textResources';

const codeList1: CodeList = [
  {
    value: 'item1',
    label: label1ResourceNb.id,
    description: description1ResourceNb.id,
    helpText: helpText1ResourceNb.id,
  },
  {
    value: 'item2',
    label: label1ResourceNb.id,
    description: description1ResourceNb.id,
    helpText: helpText1ResourceNb.id,
  },
  {
    value: 'item3',
    label: label1ResourceNb.id,
    description: description1ResourceNb.id,
    helpText: helpText1ResourceNb.id,
  },
];
const codeList1Name = 'codeList1';
export const codeList1Data: CodeListData = {
  title: codeList1Name,
  data: codeList1,
};

const codeList2: CodeList = [
  {
    value: 'item1',
    label: label1ResourceNb.id,
  },
  {
    value: 'item4',
    label: label4ResourceNb.id,
  },
];
const codeList2Name = 'codeList2';
export const codeList2Data: CodeListData = {
  title: codeList2Name,
  data: codeList2,
};

export const codeListDataList = [codeList1Data, codeList2Data];
