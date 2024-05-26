import { type LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { getDataTypeIdFromBusinessObject } from '../../utils/hookUtils/hookUtils';
import { PaymentPolicyBuilder } from '../../utils/policy';
import { type BpmnApiContextProps } from '../../contexts/BpmnApiContext';
import { type BpmnDetails } from '../../types/BpmnDetails';
import { type TaskEvent } from './types';
import { type Policy } from '../../utils/policy/types';

export class AddProcessTaskManager {
  constructor(
    private readonly org: string,
    private readonly app: string,
    private readonly addLayoutSet: BpmnApiContextProps['addLayoutSet'],
    private readonly addDataTypeToAppMetadata: BpmnApiContextProps['addDataTypeToAppMetadata'],
    private readonly bpmnDetails: BpmnDetails,
    private readonly currentPolicy: Policy,
  ) {}

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

  private handleDataTaskAdd(): void {
    this.addLayoutSet(this.createLayoutSetConfig());
  }

  private handlePaymentTaskAdd(taskEvent: TaskEvent): void {
    this.addLayoutSet(this.createLayoutSetConfig());

    const dataTypeId = getDataTypeIdFromBusinessObject(
      this.bpmnDetails.taskType,
      taskEvent.element.businessObject,
    );

    const paymentPolicyBuilder = new PaymentPolicyBuilder(this.org, this.app);
    const defaultPaymentPolicy = paymentPolicyBuilder.getDefaultPaymentPolicy(this.bpmnDetails.id);

    // Need to merge the default payment policy with the current policy, since backend does not support partial updates.
    const updatedPolicy: Policy = {
      ...this.currentPolicy,
      rules: [...this.currentPolicy.rules, ...defaultPaymentPolicy.rules],
    };

    this.addDataTypeToAppMetadata({
      dataTypeId,
      policy: updatedPolicy,
    });
  }

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
