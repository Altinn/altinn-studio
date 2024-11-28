import type { Option } from 'app-shared/types/Option';
import { CodeListType } from '@studio/components';

export const getOptionListValueType = (optionList: Option[]): CodeListType => {
  const firstValue = optionList[0].value;
  switch (typeof firstValue) {
    case CodeListType.String:
      return CodeListType.String;
    case CodeListType.Number:
      return CodeListType.Number;
    case CodeListType.Boolean:
      return CodeListType.Boolean;
    default:
      throw new Error('Unsupported type');
  }
};
