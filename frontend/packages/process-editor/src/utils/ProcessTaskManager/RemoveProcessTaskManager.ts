import { type BpmnApiContextProps } from '../../contexts/BpmnApiContext';
import { type BpmnDetails } from '../../types/BpmnDetails';
import { type TaskEvent } from './types';
import {
  getDataTypeIdFromBusinessObject,
  getLayoutSetIdFromTaskId,
} from '../../utils/hookUtils/hookUtils';

export class RemoveProcessTaskManager {
  constructor(
    private readonly layoutSets: BpmnApiContextProps['layoutSets'],
    private readonly deleteLayoutSet: BpmnApiContextProps['deleteLayoutSet'],
    private readonly deleteDataTypeFromAppMetadata: BpmnApiContextProps['deleteDataTypeFromAppMetadata'],
    private readonly bpmnDetails: BpmnDetails,
    private readonly onProcessTaskRemove: BpmnApiContextProps['onProcessTaskRemove'],
  ) {}

  /**
   * Handles the task remove event and delegates the handling to the specific task type
   * @param taskEvent
   */
  public handleTaskRemove(taskEvent: TaskEvent): void {
    if (this.bpmnDetails.taskType === 'data') {
      this.handleDataTaskRemove();
    }

    if (this.bpmnDetails.taskType === 'payment') {
      this.handlePaymentTaskRemove(taskEvent);
    }

    if (this.bpmnDetails.taskType === 'signing') {
      this.handleSigningTaskRemove(taskEvent);
    }

    // Informs the consumer of this package that a task with the provided taskEvent and taskType has been removed
    this.onProcessTaskRemove({
      taskEvent,
      taskType: this.bpmnDetails.taskType,
    });
  }

  /**
   * Deletes the layout set from the deleted data task
   * @private
   */
  private handleDataTaskRemove(): void {
    const layoutSetId = getLayoutSetIdFromTaskId(this.bpmnDetails, this.layoutSets);

    if (layoutSetId) {
      this.deleteLayoutSet({
        layoutSetIdToUpdate: layoutSetId,
      });
    }
  }

  /**
   * Deletes the dataType and layout set from the deleted payment task
   * @param taskEvent
   * @private
   */
  private handlePaymentTaskRemove(taskEvent: TaskEvent): void {
    // Delete dataType
    const dataTypeId = getDataTypeIdFromBusinessObject(
      this.bpmnDetails.taskType,
      taskEvent.element.businessObject,
    );

    this.deleteDataTypeFromAppMetadata({
      dataTypeId,
    });

    // Delete layout set
    const layoutSetId = getLayoutSetIdFromTaskId(this.bpmnDetails, this.layoutSets);
    if (layoutSetId) {
      this.deleteLayoutSet({
        layoutSetIdToUpdate: layoutSetId,
      });
    }
  }

  /**
   * Deletes the dataType from the deleted signing task
   * @param taskEvent
   * @private
   */
  private handleSigningTaskRemove(taskEvent: TaskEvent): void {
    const dataTypeId = getDataTypeIdFromBusinessObject(
      this.bpmnDetails.taskType,
      taskEvent.element.businessObject,
    );

    this.deleteDataTypeFromAppMetadata({
      dataTypeId,
    });

    // Delete layout set
    const layoutSetId = getLayoutSetIdFromTaskId(this.bpmnDetails, this.layoutSets);
    if (layoutSetId) {
      this.deleteLayoutSet({
        layoutSetIdToUpdate: layoutSetId,
      });
    }
  }
}
