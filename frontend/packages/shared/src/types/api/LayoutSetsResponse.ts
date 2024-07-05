export type BpmnTaskType = 'data' | 'confirmation' | 'feedback' | 'signing' | 'payment';

export interface LayoutSets {
  sets: LayoutSetConfig[];
}

export interface LayoutSetConfig {
  id: string;
  dataType?: string;
  tasks: string[];
}

export interface LayoutSetPayload {
  taskType: BpmnTaskType;
  layoutSetConfig: LayoutSetConfig;
}
