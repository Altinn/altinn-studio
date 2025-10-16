import type { BpmnTaskType } from '../../types/BpmnTaskType';
import type { BpmnDetails } from '../../types/BpmnDetails';

export class TaskUtils {
  public static isSigningTask(taskType: BpmnTaskType): boolean {
    const signingTasks: Array<BpmnTaskType> = ['signing'];
    return signingTasks.includes(taskType);
  }

  public static isUserControlledSigning(bpmnDetails: BpmnDetails): boolean {
    const dataType = 'user-controlled-signatures';
    return bpmnDetails.element.di.bpmnElement.extensionElements.values[0].signatureConfig.signatureDataType.includes(
      dataType,
    );
  }
}
