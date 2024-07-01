import { PaymentPolicyBuilder } from '../../../utils/policy';
import type { OnProcessTaskEvent } from '@altinn/process-editor/types/OnProcessTask';
import type { Policy } from 'app-shared/types/Policy';
import type {
  AddLayoutSetMutation,
  AddLayoutSetMutationPayload,
} from '../../../hooks/mutations/useAddLayoutSetMutation';
import { StudioModeler } from '@altinn/process-editor/utils/bpmnModeler/StudioModeler';

export class OnProcessTaskAddHandler {
  private readonly studioModeler = new StudioModeler();
  constructor(
    private readonly org: string,
    private readonly app: string,
    private readonly currentPolicy: Policy,
    private readonly addLayoutSet: AddLayoutSetMutation,
    private readonly mutateApplicationPolicy: (policy: Policy) => void,
    private readonly addDataTypeToAppMetadata: (data: {
      dataTypeId: string;
      taskId: string;
    }) => void,
  ) {}

  /**
   * This handler is responsible to react on task add event, to mutate files that are related to the task, but not a part of process-editor domain.
   * @param taskMetadata
   */
  public handleOnProcessTaskAdd(taskMetadata: OnProcessTaskEvent): void {
    if (taskMetadata.taskType === 'data') {
      this.handleDataTaskAdd(taskMetadata);
    }

    if (taskMetadata.taskType === 'payment') {
      this.handlePaymentTaskAdd(taskMetadata);
    }

    if (taskMetadata.taskType === 'signing') {
      this.handleSigningTaskAdd(taskMetadata);
    }
  }

  /**
   * Adds a layout set to the added data task
   * @param taskMetadata
   * @private
   */
  private handleDataTaskAdd(taskMetadata: OnProcessTaskEvent): void {
    this.addLayoutSet(this.createLayoutSetConfig(taskMetadata.taskEvent));
  }

  /**
   * Adds a dataType, layoutSet and default policy to the added payment task
   * @param taskMetadata
   * @private
   */
  private handlePaymentTaskAdd(taskMetadata: OnProcessTaskEvent): void {
    this.addLayoutSet(this.createLayoutSetConfig(taskMetadata.taskEvent));

    const dataTypeId = this.studioModeler.getDataTypeIdFromBusinessObject(taskMetadata.taskType);
    this.addDataTypeToAppMetadata({
      dataTypeId,
      taskId: taskMetadata.taskEvent.element.id,
    });

    const receiptPdfDataTypeId = this.studioModeler.getReceiptPdfDataTypeIdFromBusinessObject(
      taskMetadata.taskType,
    );
    this.addDataTypeToAppMetadata({
      dataTypeId: receiptPdfDataTypeId,
      taskId: taskMetadata.taskEvent.element.id,
    });

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

  /**
   * Adds a dataType to the added signing task
   * @param taskMetadata
   * @private
   */
  private handleSigningTaskAdd(taskMetadata: OnProcessTaskEvent): void {
    const dataTypeId = this.studioModeler.getDataTypeIdFromBusinessObject(taskMetadata.taskType);
    this.addDataTypeToAppMetadata({
      dataTypeId,
      taskId: taskMetadata.taskEvent.element.id,
    });
  }

  /**
   * Creates the layout set config for the task
   * @returns {{layoutSetIdToUpdate: string, layoutSetConfig: LayoutSetConfig}}
   * @private
   */
  private createLayoutSetConfig(
    taskEvent: OnProcessTaskEvent['taskEvent'],
  ): AddLayoutSetMutationPayload {
    const elementId = taskEvent.element.id;
    return {
      layoutSetIdToUpdate: elementId,
      layoutSetConfig: { id: elementId, tasks: [elementId] },
    };
  }
}
