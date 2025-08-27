import type { CodeListItem } from '@studio/components-legacy';

export type CodeListData = {
  title: string;
  data?: CodeListItem[];
  hasError?: boolean;
};
