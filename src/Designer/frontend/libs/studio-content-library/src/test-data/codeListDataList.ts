import type { CodeListWithTextResources } from '../types/CodeListWithTextResources';
import type { CodeListDataWithTextResources } from '../types/CodeListDataWithTextResources';
import {
  description1ResourceNb,
  description2ResourceNb,
  description3ResourceNb,
  helpText1ResourceNb,
  helpText2ResourceNb,
  helpText3ResourceNb,
  label1ResourceNb,
  label2ResourceNb,
  label3ResourceNb,
  label4ResourceNb,
} from './textResources';

const codeList1: CodeListWithTextResources = [
  {
    value: 'item1',
    label: label1ResourceNb.id,
    description: description1ResourceNb.id,
    helpText: helpText1ResourceNb.id,
  },
  {
    value: 'item2',
    label: label2ResourceNb.id,
    description: description2ResourceNb.id,
    helpText: helpText2ResourceNb.id,
  },
  {
    value: 'item3',
    label: label3ResourceNb.id,
    description: description3ResourceNb.id,
    helpText: helpText3ResourceNb.id,
  },
];
const codeList1Name = 'codeList1';
export const codeList1Data: CodeListDataWithTextResources = {
  title: codeList1Name,
  data: codeList1,
};

const codeList2: CodeListWithTextResources = [
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
export const codeList2Data: CodeListDataWithTextResources = {
  title: codeList2Name,
  data: codeList2,
};

export const codeListDataList = [codeList1Data, codeList2Data];
