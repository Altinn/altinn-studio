import type { DeletableCodeListData } from '../DeletableCodeListData';

export type UpdateOrgCodeListsPayload = {
  baseCommitSha: string;
  codeListWrappers: DeletableCodeListData[];
  commitMessage: string;
};
