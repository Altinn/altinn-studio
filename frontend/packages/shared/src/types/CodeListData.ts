import type { CodeListItem } from '@studio/components';

export type CodeListData = {
  title: string;
  data?: CodeListItem[];
  hasError?: boolean;
};
