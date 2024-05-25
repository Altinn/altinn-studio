import { getDataTypeIdFromBusinessObject } from '@altinn/process-editor/utils/hookUtils/hookUtils';
import { PaymentPolicyBuilder } from '@altinn/process-editor/utils/policy';
import { BpmnApiContextProps } from '@altinn/process-editor/contexts/BpmnApiContext';
import { BpmnDetails } from '@altinn/process-editor/types/BpmnDetails';
import { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { TaskEvent } from './types';
import { Policy } from '@altinn/process-editor/utils/policy/types';

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
