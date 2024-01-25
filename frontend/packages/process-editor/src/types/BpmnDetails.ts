import type { BpmnTaskType } from './BpmnTaskType';
import type { BpmnTypeEnum } from '../enum/BpmnTypeEnum';

export interface BpmnDetails {
  id: string;
  name: string;
  taskType: BpmnTaskType | null;
  type: BpmnTypeEnum;
}
