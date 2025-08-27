import type { CodeListIdSource } from '@studio/content-library';

export type OptionListReferences = OptionListReference[];

export type OptionListReference = {
  optionListId: string;
  optionListIdSources: CodeListIdSource[];
};
