import type { CodeListIdSource } from 'libs/studio-content-library/src';

export type OptionListReferences = OptionListReference[];

export type OptionListReference = {
  optionListId: string;
  optionListIdSources: CodeListIdSource[];
};
