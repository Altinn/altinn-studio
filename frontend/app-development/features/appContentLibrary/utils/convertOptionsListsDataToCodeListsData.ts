import type { OptionsListData, OptionsListsResponse } from 'app-shared/types/api/OptionsLists';
import type { CodeListData } from '@studio/content-library';

export const convertOptionsListsDataToCodeListsData = (optionListsData: OptionsListsResponse) => {
  const codeListsData = [];
  optionListsData.map((optionListData) => {
    const codeListData = convertOptionsListDataToCodeListData(optionListData);
    codeListsData.push(codeListData);
  });
  return codeListsData;
};

const convertOptionsListDataToCodeListData = (optionListData: OptionsListData) => {
  const codeListData: CodeListData = {
    title: optionListData.title,
    data: optionListData.data,
    hasError: optionListData.hasError,
  };
  return codeListData;
};
