import type { CodeListItem } from '@studio/components';

export type CodeListDataNew = {
  title: string;
  codeList?: {
    codes: CodeListItem[];
    source?: string;
    tagNames?: string[];
  };
  hasError?: boolean;
};
