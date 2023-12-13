import { BpmnTaskType } from './BpmnTaskType';
import { BpmnTypeEnum } from '../enum/BpmnTypeEnum';

export interface BpmnDetails {
  id: string;
  name: string;
  taskType: BpmnTaskType | null;
  type: BpmnTypeEnum;
}
