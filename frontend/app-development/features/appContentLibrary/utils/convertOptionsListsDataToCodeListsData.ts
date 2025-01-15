import type { OptionListData } from 'app-shared/types/OptionList';
import type { OptionListsResponse } from 'app-shared/types/api/OptionListsResponse';
import type { CodeListData } from '@studio/content-library';

export const convertOptionsListsDataToCodeListsData = (optionListsData: OptionListsResponse) => {
  const codeListsData = [];
  optionListsData.map((optionListData) => {
    const codeListData = convertOptionsListDataToCodeListData(optionListData);
    codeListsData.push(codeListData);
  });
  return codeListsData;
};

const convertOptionsListDataToCodeListData = (optionListData: OptionListData) => {
  const codeListData: CodeListData = {
    title: optionListData.title,
    data: optionListData.data,
    hasError: optionListData.hasError,
  };
  return codeListData;
};
