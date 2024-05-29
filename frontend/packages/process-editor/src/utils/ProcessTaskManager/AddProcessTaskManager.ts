import { type LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { getDataTypeIdFromBusinessObject } from '../../utils/hookUtils/hookUtils';
import { type BpmnApiContextProps } from '../../contexts/BpmnApiContext';
import { type BpmnDetails } from '../../types/BpmnDetails';
import { type TaskEvent } from './types';

export class AddProcessTaskManager {
  constructor(
    private readonly addLayoutSet: BpmnApiContextProps['addLayoutSet'],
    private readonly addDataTypeToAppMetadata: BpmnApiContextProps['addDataTypeToAppMetadata'],
    private readonly bpmnDetails: BpmnDetails,
    private readonly onProcessTaskAdd: BpmnApiContextProps['onProcessTaskAdd'],
  ) {}

  /**
   * Handles the task add event and delegates the handling to the specific task type
   * @param taskEvent
   */
  public handleTaskAdd(taskEvent: TaskEvent): void {
    if (this.bpmnDetails.taskType === 'data') {
      this.handleDataTaskAdd();
    }

    if (this.bpmnDetails.taskType === 'payment') {
      this.handlePaymentTaskAdd(taskEvent);
    }

    if (this.bpmnDetails.taskType === 'signing') {
      this.handleSigningTaskAdd(taskEvent);
    }

    // Informs the consumer of this package that a task with the given taskEvent and taskType has been added
    this.onProcessTaskAdd({
      taskEvent,
      taskType: this.bpmnDetails.taskType,
    });
  }

  /**
   * Adds a layout set to the added data task
   * @private
   */
  private handleDataTaskAdd(): void {
    this.addLayoutSet(this.createLayoutSetConfig());
  }

  /**
   * Adds a dataType and layoutSet to the added payment task
   * @param taskEvent
   * @private
   */
  private handlePaymentTaskAdd(taskEvent: TaskEvent): void {
    // Add layout set to the task
    this.addLayoutSet(this.createLayoutSetConfig());

    // Add dataType
    const dataTypeId = getDataTypeIdFromBusinessObject(
      this.bpmnDetails.taskType,
      taskEvent.element.businessObject,
    );

    this.addDataTypeToAppMetadata({
      dataTypeId,
    });
  }

  /**
   * Adds a dataType and layout set to the added signing task
   * @param taskEvent
   * @private
   */
  private handleSigningTaskAdd(taskEvent: TaskEvent): void {
    const dataTypeId = getDataTypeIdFromBusinessObject(
      this.bpmnDetails.taskType,
      taskEvent.element.businessObject,
    );

    this.addDataTypeToAppMetadata({
      dataTypeId,
    });
  }

  /**
   * Creates the layout set config for the task
   * @returns {{layoutSetIdToUpdate: string, layoutSetConfig: LayoutSetConfig}}
   * @private
   */
  private createLayoutSetConfig(): {
    layoutSetIdToUpdate: string;
    layoutSetConfig: LayoutSetConfig;
  } {
    return {
      layoutSetIdToUpdate: this.bpmnDetails.id,
      layoutSetConfig: { id: this.bpmnDetails.id, tasks: [this.bpmnDetails.id] },
    };
  }
}
