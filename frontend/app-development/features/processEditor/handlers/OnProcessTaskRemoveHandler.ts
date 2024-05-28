import type { Policy } from 'app-shared/types/Policy';
import type { OnProcessTaskEvent } from '@altinn/process-editor/types/OnProcessTask';
import { PaymentPolicyBuilder } from '../../../utils/policy';

export class OnProcessTaskRemoveHandler {
  constructor(
    private readonly org: string,
    private readonly app: string,
    private readonly currentPolicy: Policy,
    private readonly mutateApplicationPolicy: (policy: Policy) => void,
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

  private handlePaymentTaskRemove(taskMetadata: OnProcessTaskEvent): void {
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
  }
}
