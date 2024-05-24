import { BpmnApiContextProps } from '@altinn/process-editor/contexts/BpmnApiContext';
import { BpmnDetails } from '@altinn/process-editor/types/BpmnDetails';
import { TaskEvent } from './types';
import { BpmnTypeEnum } from '@altinn/process-editor/enum/BpmnTypeEnum';
import {
  getDataTypeIdFromBusinessObject,
  getLayoutSetIdFromTaskId,
} from '@altinn/process-editor/utils/hookUtils/hookUtils';

export class RemoveProcessTaskManager {
  constructor(
    // org and app might be needed for deleting, check when the endpoint is implemented
    // private readonly org: string,
    // private readonly app: string,
    private readonly layoutSets: BpmnApiContextProps['layoutSets'],
    private readonly deleteLayoutSet: BpmnApiContextProps['deleteLayoutSet'],
    private readonly deleteDataTypeFromAppMetadata: BpmnApiContextProps['deleteDataTypeFromAppMetadata'],
    private readonly bpmnDetails: BpmnDetails,
  ) {}

  public handleTaskRemove(taskEvent: TaskEvent): void {
    if (this.bpmnDetails.type === BpmnTypeEnum.Task) {
      this.handleDataTaskRemove();
    }

    if (this.bpmnDetails.taskType === 'payment') {
      this.handlePaymentTaskRemove(taskEvent);
    }

    if (this.bpmnDetails.taskType === 'signing') {
      this.handleSigningTaskRemove(taskEvent);
    }
  }

  private handleDataTaskRemove(): void {
    const layoutSetId = getLayoutSetIdFromTaskId(this.bpmnDetails, this.layoutSets);
    if (layoutSetId) {
      this.deleteLayoutSet({
        layoutSetIdToUpdate: layoutSetId,
      });
    }
  }

  private handlePaymentTaskRemove(taskEvent: TaskEvent): void {
    const dataTypeId = getDataTypeIdFromBusinessObject(
      this.bpmnDetails.taskType,
      taskEvent.element.businessObject,
    );

    // TODO should add the policy that we want to keep. Meaning we need to remove the policy from the frontend.
    this.deleteDataTypeFromAppMetadata({
      dataTypeId,
    });
  }

  private handleSigningTaskRemove(taskEvent: TaskEvent): void {
    const dataTypeId = getDataTypeIdFromBusinessObject(
      this.bpmnDetails.taskType,
      taskEvent.element.businessObject,
    );

    this.deleteDataTypeFromAppMetadata({
      dataTypeId,
    });
  }
}
