import type { CodeListWithTextResources } from './CodeListWithTextResources';

export type CodeListDataWithTextResources = {
  title: string;
  data?: CodeListWithTextResources;
  hasError?: boolean;
};
