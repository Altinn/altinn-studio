import { CodeListUsageTaskType } from '../../../../../types/CodeListUsageTaskType';

export type CodeListReference = {
  codeListId: string;
  codeListIdSources: CodeListIdSource[];
};

export type CodeListIdSource = {
  taskName: string;
  taskType: CodeListUsageTaskType;
  layoutName: string;
  componentIds: string[];
};
