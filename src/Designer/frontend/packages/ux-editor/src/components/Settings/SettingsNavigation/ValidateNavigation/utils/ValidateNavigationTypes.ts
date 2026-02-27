import type { StudioSuggestionItem } from '@studio/components';

export type InternalConfigState = {
  types: StudioSuggestionItem[];
  pageScope: StudioSuggestionItem;
  pages?: StudioSuggestionItem[];
  tasks?: StudioSuggestionItem[];
  task?: StudioSuggestionItem;
};

export type ExternalConfigState = {
  show: string[];
  page: string;
  tasks?: string[];
  task?: string;
  pages?: string[];
};

export type ExternalConfigWithId = ExternalConfigState & { id: string };
