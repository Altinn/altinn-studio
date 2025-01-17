import type { OptionListData } from 'app-shared/types/OptionList';
import type { CodeListData } from '@studio/content-library';

export const convertOptionListDataListToCodeListDataList = (
  optionListsData: OptionListData[],
): CodeListData[] => optionListsData.map(convertOptionsListDataToCodeListData);

const convertOptionsListDataToCodeListData = (optionListData: OptionListData): CodeListData => ({
  title: optionListData.title,
  data: optionListData.data,
  hasError: optionListData.hasError,
});
