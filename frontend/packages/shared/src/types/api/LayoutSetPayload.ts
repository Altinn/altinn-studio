import type { BpmnTaskType } from '../BpmnTaskType';

export interface LayoutSetPayload {
  taskType?: BpmnTaskType;
  layoutSetConfig: LayoutSetConfigPayload;
}

type SubFormConfig = {
  type: string;
};

type RegularLayoutSetConfig = {
  tasks: string[];
};

export type LayoutSetConfigPayload = {
  id: string;
  dataType?: string;
} & (SubFormConfig | RegularLayoutSetConfig);
