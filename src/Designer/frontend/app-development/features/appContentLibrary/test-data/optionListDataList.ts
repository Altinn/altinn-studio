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
import type { OptionList, OptionListData } from 'app-shared/types/OptionList';

const optionList1: OptionList = [
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
const optionList1Name = 'optionList1';
export const optionList1Data: OptionListData = {
  title: optionList1Name,
  data: optionList1,
};

const optionList2: OptionList = [
  {
    value: 'item1',
    label: label1ResourceNb.id,
  },
  {
    value: 'item4',
    label: label4ResourceNb.id,
  },
];
const optionList2Name = 'optionList2';
export const optionList2Data: OptionListData = {
  title: optionList2Name,
  data: optionList2,
};

export const optionListDataList = [optionList1Data, optionList2Data];
