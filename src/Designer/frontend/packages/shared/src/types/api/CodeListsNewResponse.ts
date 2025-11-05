import type { CodeListDataNew } from '../CodeListDataNew';

export type CodeListsNewResponse = {
  codeListWrappers: CodeListDataNew[];
  commitSha: string;
};
