import type { Policy } from 'app-shared/types/Policy';
import type { OnProcessTaskEvent } from '@altinn/process-editor/types/OnProcessTask';
import { PaymentPolicyBuilder } from '../../../utils/policy';
import {
  getDataTypeIdFromBusinessObject,
  getLayoutSetIdFromTaskId,
} from '@altinn/process-editor/utils/hookUtils/hookUtils';
import { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

export class OnProcessTaskRemoveHandler {
  constructor(
    private readonly org: string,
    private readonly app: string,
    private readonly currentPolicy: Policy,
    private readonly layoutSets: LayoutSets,
    private readonly mutateApplicationPolicy: (policy: Policy) => void,
    private readonly deleteDataTypeFromAppMetadata: (data: { dataTypeId: string }) => void,
    private readonly deleteLayoutSet: (data: { layoutSetIdToUpdate: string }) => void,
  ) {}

  /**
   * This handler is responsible to react on task remove event, to mutate files that are related to the task, but not a part of process-editor domain.
   * @param taskMetadata
   */
  public handleOnProcessTaskRemove(taskMetadata: OnProcessTaskEvent): void {
    if (taskMetadata.taskType === 'payment') {
      this.handlePaymentTaskRemove(taskMetadata);
    }
  }

  /**
   * Deletes the dataType, layoutSet and policy for the deleted payment task
   * @param taskMetadata
   * @private
   */
  private handlePaymentTaskRemove(taskMetadata: OnProcessTaskEvent): void {
    // Delete dataType
    const dataTypeId = getDataTypeIdFromBusinessObject(
      taskMetadata.taskType,
      taskMetadata.taskEvent.element.businessObject,
    );

    this.deleteDataTypeFromAppMetadata({
      dataTypeId,
    });

    // Delete policy
    const paymentPolicyBuilder = new PaymentPolicyBuilder(this.org, this.app);
    const currentPaymentRuleId = paymentPolicyBuilder.getPolicyRuleId(
      taskMetadata.taskEvent.element.id,
    );

    // Need to merge the default payment policy with the current policy, since backend does not support partial updates.
    const updatedPolicy: Policy = {
      ...this.currentPolicy,
      rules: this.currentPolicy.rules.filter((rule) => rule.ruleId !== currentPaymentRuleId),
    };

    this.mutateApplicationPolicy(updatedPolicy);

    // Delete layout set
    const layoutSetId = getLayoutSetIdFromTaskId(
      taskMetadata.taskEvent.element.id,
      this.layoutSets,
    );
    if (layoutSetId) {
      this.deleteLayoutSet({
        layoutSetIdToUpdate: layoutSetId,
      });
    }
  }
}
