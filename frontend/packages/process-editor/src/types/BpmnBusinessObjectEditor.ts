import type { BpmnTaskType } from './BpmnTaskType';
import type { BpmnTypeEnum } from '../enum/BpmnTypeEnum';

export interface BpmnBusinessObjectEditor {
  $type: BpmnTypeEnum;
  id: string;
  name?: string;
  extensionElements?: BpmnExtensionElementsEditor;
}

export interface BpmnExtensionElementsEditor {
  values?: Array<{
    taskType: BpmnTaskType;
    $type: string;
  }>;
}
