import type { CodeList } from './CodeList';

export type CodeListData = {
  title: string;
  data?: CodeList;
  hasError?: boolean;
};
