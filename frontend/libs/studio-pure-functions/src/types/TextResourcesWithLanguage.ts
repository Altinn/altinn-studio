import type { TextResource } from './TextResource';

export type TextResourcesWithLanguage = {
  language: string;
  resources: TextResource[];
};
