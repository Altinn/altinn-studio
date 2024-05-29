import type { OnProcessTaskEvent } from '@altinn/process-editor/types/OnProcessTask';
import { PaymentPolicyBuilder } from '../../../utils/policy';
import type { Policy } from 'app-shared/types/Policy';

export class OnProcessTaskAddHandler {
  constructor(
    private readonly org: string,
    private readonly app: string,
    private readonly currentPolicy: Policy,
    private readonly mutateApplicationPolicy: (policy: Policy) => void,
  ) {}

  /**
   * This handler is responsible to react on task add event, to mutate files that are related to the task, but not a part of process-editor domain.
   * @param taskMetadata
   */
  public handleOnProcessTaskAdd(taskMetadata: OnProcessTaskEvent): void {
    if (taskMetadata.taskType === 'payment') {
      this.handlePaymentTaskAdd(taskMetadata);
    }
  }

  private handlePaymentTaskAdd(taskMetadata: OnProcessTaskEvent): void {
    const paymentPolicyBuilder = new PaymentPolicyBuilder(this.org, this.app);
    const defaultPaymentPolicy = paymentPolicyBuilder.getDefaultPaymentPolicy(
      taskMetadata.taskEvent.element.id,
    );

    // Need to merge the default payment policy with the current policy, since backend does not support partial updates.
    this.mutateApplicationPolicy({
      ...this.currentPolicy,
      rules: [...this.currentPolicy.rules, ...defaultPaymentPolicy.rules],
    });
  }
}
