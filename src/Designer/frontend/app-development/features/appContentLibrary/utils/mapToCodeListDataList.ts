import type { OptionListData } from 'app-shared/types/OptionList';
import type { CodeListDataWithTextResources } from '@designer/content-library';

export const mapToCodeListDataList = (
  optionListDataList: OptionListData[],
): CodeListDataWithTextResources[] => optionListDataList.map(convertOptionListDataToCodeListData);

const convertOptionListDataToCodeListData = (
  optionListData: OptionListData,
): CodeListDataWithTextResources => ({
  title: optionListData.title,
  data: optionListData.data,
  hasError: optionListData.hasError,
});
