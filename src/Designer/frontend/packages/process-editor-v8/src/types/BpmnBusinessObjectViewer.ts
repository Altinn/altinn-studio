import type { BpmnTaskType } from './BpmnTaskType';
import type { BpmnTypeEnum } from '../enum/BpmnTypeEnum';

export interface BpmnBusinessObjectViewer {
  $type: BpmnTypeEnum;
  id: string;
  name?: string;
  $attrs: {
    'altinn:tasktype': BpmnTaskType;
  };
}
