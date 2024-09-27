import type { BpmnTaskType } from '../BpmnTaskType';

export interface LayoutSetPayload {
  taskType?: BpmnTaskType;
  layoutSetConfig: LayoutSetConfig;
}

type SubFormConfig = {
  type: 'subform';
};

type RegularLayoutSetConfig = {
  tasks: string[];
};

export type LayoutSetConfig = {
  id: string;
  dataType?: string;
} & (SubFormConfig | RegularLayoutSetConfig);
