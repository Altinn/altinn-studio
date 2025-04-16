import type { UsageBpmnTaskType } from './UsageBpmnTaskType';

export type CodeListReference = {
  codeListId: string;
  codeListIdSources: CodeListIdSource[];
};

export type CodeListIdSource = {
  taskName: string;
  taskType: UsageBpmnTaskType;
  layoutName: string;
  componentIds: string[];
};
