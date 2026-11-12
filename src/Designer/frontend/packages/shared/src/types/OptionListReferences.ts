import type { CodeListIdSource } from '@designer/content-library';

export type OptionListReferences = OptionListReference[];

export type OptionListReference = {
  optionListId: string;
  optionListIdSources: CodeListIdSource[];
};
