import { type BpmnApiContextProps } from '../../contexts/BpmnApiContext';
import { type BpmnDetails } from '../../types/BpmnDetails';
import { type TaskEvent } from './types';
import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import {
  getDataTypeIdFromBusinessObject,
  getLayoutSetIdFromTaskId,
} from '../../utils/hookUtils/hookUtils';
import { type Policy } from '../../utils/policy/types';
import { PaymentPolicyBuilder } from '../../utils/policy';

export class RemoveProcessTaskManager {
  constructor(
    private readonly org: string,
    private readonly app: string,
    private readonly layoutSets: BpmnApiContextProps['layoutSets'],
    private readonly deleteLayoutSet: BpmnApiContextProps['deleteLayoutSet'],
    private readonly deleteDataTypeFromAppMetadata: BpmnApiContextProps['deleteDataTypeFromAppMetadata'],
    private readonly bpmnDetails: BpmnDetails,
    private readonly currentPolicy: Policy,
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

    const paymentPolicyBuilder = new PaymentPolicyBuilder(this.org, this.app);
    const currentPaymentRuleId = paymentPolicyBuilder.getPolicyRuleId(this.bpmnDetails.id);

    const updatedPolicy: Policy = {
      ...this.currentPolicy,
      rules: this.currentPolicy.rules.filter((rule) => rule.ruleId !== currentPaymentRuleId),
    };

    this.deleteDataTypeFromAppMetadata({
      dataTypeId,
      policy: updatedPolicy,
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
