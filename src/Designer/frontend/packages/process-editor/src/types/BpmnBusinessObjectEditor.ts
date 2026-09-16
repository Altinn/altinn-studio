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
      /**
       * The data type the pdf generated at task end is stored in. Optional in the schema: a signing
       * task that declares none generates no pdf.
       */
      signingPdfDataType?: string;
      /** Set, together with a signee provider, on a user controlled signing task. */
      signeeStatesDataTypeId?: string;
    };
  }>;
}
