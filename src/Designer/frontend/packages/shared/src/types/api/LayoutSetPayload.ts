import type { BpmnTaskType } from '../BpmnTaskType';

export interface LayoutSetPayload {
  taskType?: BpmnTaskType;
  layoutSetConfig: LayoutSetConfig;
}

type SubformConfig = {
  type: 'subform';
};

type RegularLayoutSetConfig = {
  tasks: string[];
};

export type LayoutSetConfig = {
  id: string;
  dataType?: string;
} & (SubformConfig | RegularLayoutSetConfig);
