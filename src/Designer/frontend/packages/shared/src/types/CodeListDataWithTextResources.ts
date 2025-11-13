import type { CodeListItem } from '@studio/components-legacy';

export type CodeListDataWithTextResources = {
  title: string;
  data?: CodeListItem[];
  hasError?: boolean;
};
