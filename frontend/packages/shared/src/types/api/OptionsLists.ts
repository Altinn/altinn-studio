import type { Option } from 'app-shared/types/Option';
import type { CodeListIdSource } from '@studio/content-library';

export type OptionsLists = Record<string, Option[]>;

export type OptionListsReferences = OptionListsReference[];

export type OptionListsReference = {
  optionListId: string;
  optionListIdSources: CodeListIdSource[];
};
