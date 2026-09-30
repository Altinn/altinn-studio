import type { BpmnTaskType } from '../BpmnTaskType';

export interface LayoutSetPayload {
  taskType?: BpmnTaskType;
  layoutSetConfig: LayoutSetConfig;
}

type SubformConfig = {
  type: 'subform';
};

type RegularLayoutSetConfig = {
  taskId: string;
};

export type LayoutSetConfig = {
  id: string;
  dataType?: string;
} & (SubformConfig | RegularLayoutSetConfig);
