import type { StudioSuggestionItem } from '@studio/components';

export type ValidateConfigState = {
  types: StudioSuggestionItem[];
  pageScope: string;
  tasks?: StudioSuggestionItem[];
  task?: StudioSuggestionItem;
  pages?: StudioSuggestionItem[];
};
