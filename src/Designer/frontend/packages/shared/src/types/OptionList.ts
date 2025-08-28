import type { Option } from 'app-shared/types/Option';

export type OptionList = Option[];

export type OptionListData = {
  title: string;
  data?: OptionList;
  hasError?: boolean;
};
