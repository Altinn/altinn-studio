import type { BpmnTaskType } from './BpmnTaskType';
import type { BpmnTypeEnum } from '../enum/BpmnTypeEnum';
import type { Element } from 'bpmn-js/lib/model/Types';

export interface BpmnDetails {
  id: string;
  name: string;
  taskType: BpmnTaskType | null;
  type: BpmnTypeEnum;
  element?: Element;
}
