import { BpmnTaskType } from './BpmnTaskType';

export interface BpmnDetails {
  id: string;
  name: string;
  type: BpmnTaskType;
}
