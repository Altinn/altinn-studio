import type { Option } from 'app-shared/types/Option';
import type { CodeListIdSource } from '@studio/content-library';

export type OptionsList = Option[];

export type OptionsListData = {
  title: string;
  data?: OptionsList;
  hasError?: boolean;
};

export type OptionsListsResponse = OptionsListData[];

export type OptionListsReference = {
  optionListId: string;
  optionListIdSources: CodeListIdSource[];
};

export type OptionListsReferences = OptionListsReference[];
