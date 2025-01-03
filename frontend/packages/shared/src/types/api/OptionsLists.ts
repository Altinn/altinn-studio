import type { Option } from 'app-shared/types/Option';

export type OptionsList = Option[];

export type OptionsListData = {
  title: string;
  data?: OptionsList;
  hasError?: boolean;
};

export type OptionsListsResponse = OptionsListData[];
