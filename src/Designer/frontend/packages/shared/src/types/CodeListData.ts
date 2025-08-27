import type { CodeListItem } from 'libs/studio-components-legacy/src';

export type CodeListData = {
  title: string;
  data?: CodeListItem[];
  hasError?: boolean;
};
