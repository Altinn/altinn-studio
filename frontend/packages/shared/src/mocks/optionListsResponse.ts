import type { OptionListsResponse } from '../types/api/OptionListsResponse';
import type { OptionListData } from '../types/OptionList';

const optionList1: OptionListData = {
  title: 'optionList1',
  data: [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
  ],
};

const optionList2: OptionListData = {
  title: 'optionList2',
  data: [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
    { label: 'C', value: 'c' },
  ],
};

export const optionListsResponse: OptionListsResponse = [optionList1, optionList2];
