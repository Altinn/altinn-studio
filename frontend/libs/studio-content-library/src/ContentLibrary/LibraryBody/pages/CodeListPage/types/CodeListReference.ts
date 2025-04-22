import type { CodeListUsageTaskType } from '../../../../../types/CodeListUsageTaskType';

export type CodeListReference = {
  codeListId: string;
  codeListIdSources: CodeListIdSource[];
};

export type CodeListIdSource = {
  taskId: string;
  taskType: CodeListUsageTaskType;
  layoutName: string;
  componentIds: string[];
};
