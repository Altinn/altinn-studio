import type { CodeListWithTextResources } from './CodeListWithTextResources';

export type CodeListData = {
  title: string;
  data?: CodeListWithTextResources;
  hasError?: boolean;
};
