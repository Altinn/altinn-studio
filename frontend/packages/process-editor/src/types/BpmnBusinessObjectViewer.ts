import type { BpmnTaskType } from './BpmnTaskType';
import type { BpmnTypeEnum } from '../enum/BpmnTypeEnum';

export interface BpmnBusinessObjectViewer {
  $type: BpmnTypeEnum;
  id: string;
  name?: string;
  extensionElements?: BpmnExtensionElementsViewer;
}

export interface BpmnExtensionElementsViewer {
  values?: Array<{
    $children: Array<{
      $body: BpmnTaskType;
      $type: string;
    }>;
  }>;
}
