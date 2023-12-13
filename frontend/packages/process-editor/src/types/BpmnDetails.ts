import { BpmnTaskType } from './BpmnTaskType';

export interface BpmnDetails {
  id: string;
  name: string;
  taskType: BpmnTaskType;
  type: string | null;
}
