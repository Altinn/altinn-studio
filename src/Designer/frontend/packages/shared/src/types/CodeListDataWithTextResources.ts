import type { CodeListItem } from '@studio/components';

export type CodeListDataWithTextResources = {
  title: string;
  data?: CodeListItem[];
  hasError?: boolean;
};
