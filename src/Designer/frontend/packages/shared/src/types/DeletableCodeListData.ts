import type { CodeListDataNew } from './CodeListDataNew';

export type DeletableCodeListData = Omit<CodeListDataNew, 'codeList'> & {
  codeList: CodeListDataNew['codeList'] | null;
};
