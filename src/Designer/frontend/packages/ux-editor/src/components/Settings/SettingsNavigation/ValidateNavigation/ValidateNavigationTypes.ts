import type { StudioSuggestionItem } from '@studio/components';

export type ValidateConfigState = {
  types: StudioSuggestionItem[];
  pageScope: StudioSuggestionItem;
  pages?: StudioSuggestionItem[];
  tasks?: StudioSuggestionItem[];
  task?: StudioSuggestionItem;
};

export type ExternalConfigState = {
  show: string[];
  page: string;
}; // Will be used to store config in the layout.json in next PR, can be adapted as needed
