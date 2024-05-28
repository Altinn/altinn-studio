import { type LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { getDataTypeIdFromBusinessObject } from '../../utils/hookUtils/hookUtils';
import { PaymentPolicyBuilder } from '../../utils/policy';
import { type BpmnApiContextProps } from '../../contexts/BpmnApiContext';
import { type BpmnDetails } from '../../types/BpmnDetails';
import { type TaskEvent } from './types';
import { Policy } from 'app-shared/types/Policy';

export class AddProcessTaskManager {
  constructor(
    private readonly org: string,
    private readonly app: string,
    private readonly addLayoutSet: BpmnApiContextProps['addLayoutSet'],
    private readonly addDataTypeToAppMetadata: BpmnApiContextProps['addDataTypeToAppMetadata'],
    private readonly mutateApplicationPolicy: BpmnApiContextProps['mutateApplicationPolicy'],
    private readonly bpmnDetails: BpmnDetails,
    private readonly currentPolicy: Policy,
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
  }

  /**
   * Adds a layout set to the added data task
   * @private
   */
  private handleDataTaskAdd(): void {
    this.addLayoutSet(this.createLayoutSetConfig());
  }

  /**
   * Adds a dataType, default Policy and layout set to the added payment task
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

    // Add default payment policy
    const paymentPolicyBuilder = new PaymentPolicyBuilder(this.org, this.app);
    const defaultPaymentPolicy = paymentPolicyBuilder.getDefaultPaymentPolicy(this.bpmnDetails.id);

    // Need to merge the default payment policy with the current policy, since backend does not support partial updates.
    const updatedPolicy: Policy = {
      ...this.currentPolicy,
      rules: [...this.currentPolicy.rules, ...defaultPaymentPolicy.rules],
    };

    this.mutateApplicationPolicy(updatedPolicy);
  }

  /**
   * Adds a dataType and layout set to the added signing task
   * @param taskEvent
   * @private
   */
  private handleSigningTaskAdd(taskEvent: TaskEvent): void {
    this.addLayoutSet(this.createLayoutSetConfig());

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
