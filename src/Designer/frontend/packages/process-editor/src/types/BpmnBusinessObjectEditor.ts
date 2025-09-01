import type { BpmnTaskType } from './BpmnTaskType';
import type { BpmnTypeEnum } from '../enum/BpmnTypeEnum';

export interface BpmnBusinessObjectEditor {
  $type: BpmnTypeEnum;
  id: string;
  name?: string;
  extensionElements?: BpmnExtensionElementsEditor;
  $attrs?: {
    'altinn:tasktype': BpmnTaskType;
  };
}

export interface BpmnExtensionElementsEditor {
  values?: Array<{
    taskType: BpmnTaskType;
    $type: string;
    paymentConfig?: {
      paymentDataType: string;
      paymentReceiptPdfDataType: string;
    };
    signatureConfig?: {
      signatureDataType: string;
    };
  }>;
}
