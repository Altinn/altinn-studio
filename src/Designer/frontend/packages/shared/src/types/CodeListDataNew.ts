import type { MultiLanguageCodeListItem } from '@studio/components';

export type CodeListDataNew = {
  title: string;
  codeList?: {
    codes: MultiLanguageCodeListItem[];
    source?: string;
    tagNames?: string[];
  };
  hasError?: boolean;
};
