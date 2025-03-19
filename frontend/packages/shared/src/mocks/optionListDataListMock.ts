import type { OptionList, OptionListData } from 'app-shared/types/OptionList';
import { optionListMock } from './optionListsResponseMocks';

const title1: string = 'title1';
const title2: string = 'title2';

const optionList1: OptionList = optionListMock;

const optionListData1: OptionListData = {
  title: title1,
  data: optionList1,
  hasError: false,
};

const optionListData2: OptionListData = {
  title: title2,
  hasError: true,
};

export const optionListDataListMock: OptionListData[] = [optionListData1, optionListData2];
