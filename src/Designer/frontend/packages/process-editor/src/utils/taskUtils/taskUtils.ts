import type { BpmnTaskType } from '../../types/BpmnTaskType';
import type { Element } from 'bpmn-moddle';

export class TaskUtils {
  public static isSigningTask(taskType: BpmnTaskType): boolean {
return taskType === 'signing' ;
  }

  public static isUserControlledSigning(bpmnDetails: Element): boolean {
    const dataType = 'user-controlled-signatures';
    const signatureConfig =
      bpmnDetails.di?.bpmnElement?.extensionElements?.values?.[0]?.signatureConfig;
    return signatureConfig?.signatureDataType?.includes(dataType) ?? false;
  }
}
