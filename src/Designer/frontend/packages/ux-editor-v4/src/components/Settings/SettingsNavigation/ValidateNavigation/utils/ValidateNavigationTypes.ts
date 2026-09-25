import type { StudioSuggestionItem } from '@studio/components';

export type InternalConfigState = {
  types: StudioSuggestionItem[];
  pageScope: StudioSuggestionItem | null;
  pages?: StudioSuggestionItem[];
  tasks?: StudioSuggestionItem[];
  task?: StudioSuggestionItem | null;
};

export type ExternalConfigState = {
  show?: string[];
  page?: string;
  tasks?: string[];
  task?: string;
  pages?: string[];
};
