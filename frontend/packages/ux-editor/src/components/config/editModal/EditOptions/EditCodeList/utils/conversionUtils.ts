import type { Option } from 'app-shared/types/Option';
import type { CodeListItem } from '@studio/components';

export const convertOptionsListToCodeListItemList = (optionList: Option[]): CodeListItem[] => {
  if (optionList === undefined) return [];

  const tempList: CodeListItem[] = [];
  if (optionList.length === 0) return tempList;

  optionList.forEach((option: Option) => {
    tempList.push({
      label: option.label,
      value: option.value,
      description: option.description ?? '',
      helpText: option.helpText ?? '',
    });
  });
  return tempList;
};

export const convertCodeListItemListToOptionsList = (
  codeListItemList: CodeListItem[],
): Option[] => {
  if (codeListItemList === undefined) return [];

  const tempList: Option[] = [];
  if (codeListItemList.length === 0) return tempList;

  codeListItemList.forEach((codeListItem: CodeListItem) => {
    tempList.push({
      label: codeListItem.label,
      value: codeListItem.value,
      description: codeListItem.description ?? '',
      helpText: codeListItem.helpText ?? '',
    });
  });
  return tempList;
};
