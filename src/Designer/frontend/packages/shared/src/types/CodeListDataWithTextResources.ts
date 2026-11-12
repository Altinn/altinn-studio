import type { CodeListItem } from '@designer/components';

export type CodeListDataWithTextResources = {
  title: string;
  data?: CodeListItem[];
  hasError?: boolean;
};
