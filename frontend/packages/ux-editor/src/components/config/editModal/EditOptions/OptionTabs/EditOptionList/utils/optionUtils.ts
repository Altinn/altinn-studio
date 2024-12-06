import type { Option } from 'app-shared/types/Option';
import type { CodeListType } from '@studio/components';

export const getOptionListValueType = (optionList: Option[]): CodeListType => {
  const firstValue = optionList?.[0]?.value;
  switch (typeof firstValue) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      throw new Error('Unsupported type');
  }
};
