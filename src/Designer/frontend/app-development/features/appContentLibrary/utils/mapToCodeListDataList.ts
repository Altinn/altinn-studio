import type { OptionListData } from 'app-shared/types/OptionList';
import type { CodeListData } from '@studio/content-library';

export const mapToCodeListDataList = (optionListDataList: OptionListData[]): CodeListData[] =>
  optionListDataList.map(convertOptionListDataToCodeListData);

const convertOptionListDataToCodeListData = (optionListData: OptionListData): CodeListData => ({
  title: optionListData.title,
  data: optionListData.data,
  hasError: optionListData.hasError,
});
