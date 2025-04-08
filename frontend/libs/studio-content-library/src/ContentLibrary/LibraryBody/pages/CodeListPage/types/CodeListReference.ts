import type { UsageBpmnTaskType } from './UsageBpmnTaskType';

export type CodeListReference = {
  codeListId: string;
  codeListIdSources: CodeListIdSource[];
};

export type CodeListIdSource = {
  taskId: string;
  taskType: UsageBpmnTaskType;
  layoutSetId: string;
  layoutName: string;
  componentIds: string[];
};
