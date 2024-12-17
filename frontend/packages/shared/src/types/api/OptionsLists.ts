import type { Option } from 'app-shared/types/Option';
import type { CodeListIdSource } from '@studio/content-library';

export type OptionsList = Option[];

export type OptionsLists = Record<string, OptionsList>;

export type OptionListsReferences = OptionListsReference[];

export type OptionListsReference = {
  optionListId: string;
  optionListIdSources: CodeListIdSource[];
};
