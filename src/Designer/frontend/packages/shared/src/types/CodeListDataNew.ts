import type { MultiLanguageCodeListItem } from '@designer/components';

export type CodeListDataNew = {
  title: string;
  codeList?: {
    codes: MultiLanguageCodeListItem[];
    source?: string;
    tagNames?: string[];
  };
  hasError?: boolean;
};
