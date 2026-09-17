import { PaymentPolicyBuilder } from 'app-development/utils/policy';
import type { OnProcessTaskEvent } from '@altinn/process-editor/types/OnProcessTask';
import type { Policy } from 'app-shared/types/Policy';
import type {
  AddLayoutSetMutation,
  AddLayoutSetMutationPayload,
} from 'app-development/hooks/mutations/useAddLayoutSetMutation';
import { StudioModeler } from '@altinn/process-editor/utils/bpmnModeler/StudioModeler';
import type { Element } from 'bpmn-js/lib/model/Types';
import { TaskUtils } from '@altinn/process-editor/utils/taskUtils';
import type { BpmnTaskType as LayoutSetTaskType } from 'app-shared/types/BpmnTaskType';

export enum AllowedContributor {
  AppOwned = 'app:owned',
}

/** The backend defaults to json, so only the pdf data types state their content type. */
export enum AllowedContentType {
  Pdf = 'application/pdf',
}

export class OnProcessTaskAddHandler {
  constructor(
    private readonly org: string,
    private readonly app: string,
    private readonly currentPolicy: Policy,
    private readonly addLayoutSet: AddLayoutSetMutation,
    private readonly mutateApplicationPolicy: (policy: Policy) => void,
    private readonly addDataTypeToAppMetadata: (data: {
      dataTypeId: string;
      taskId: string;
      allowedContributors?: Array<string>;
      allowedContentTypes?: Array<string>;
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
    this.addLayoutSet(this.createLayoutSetConfig(taskMetadata, 'data'));
  }

  /**
   * Adds a dataType, layoutSet and default policy to the added payment task
   * @param taskMetadata
   * @private
   */
  private handlePaymentTaskAdd(taskMetadata: OnProcessTaskEvent): void {
    this.addLayoutSet(this.createLayoutSetConfig(taskMetadata, 'payment'));

    const studioModeler = new StudioModeler(taskMetadata.taskEvent.element as Element);
    const dataTypeId = studioModeler.getDataTypeIdFromBusinessObject(
      'payment',
      taskMetadata.taskEvent.element.businessObject,
    );
    this.addDataTypeToAppMetadata({
      dataTypeId,
      taskId: taskMetadata.taskEvent.element.id,
      allowedContributors: [AllowedContributor.AppOwned],
    });

    const receiptPdfDataTypeId = studioModeler.getReceiptPdfDataTypeIdFromBusinessObject(
      taskMetadata.taskEvent.element.businessObject,
    );
    this.addDataTypeToAppMetadata({
      dataTypeId: receiptPdfDataTypeId,
      taskId: taskMetadata.taskEvent.element.id,
      allowedContributors: [AllowedContributor.AppOwned],
      allowedContentTypes: [AllowedContentType.Pdf],
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
   * Adds a dataType and layoutset to the added signing task
   * @param taskMetadata
   * @private
   */
  private handleSigningTaskAdd(taskMetadata: OnProcessTaskEvent): void {
    this.handleGenericSigningTaskAdd(taskMetadata);
    this.addSigningPdfToApplicationMetadata(taskMetadata);
    if (TaskUtils.isUserControlledSigning(taskMetadata.taskEvent.element as Element)) {
      this.addSigneeStateToApplicationMetadata(taskMetadata);
    }
  }

  /**
   * Creates the layout set config for the task
   * @returns {{layoutSetConfig: LayoutSetConfig}}
   * @private
   */
  private createLayoutSetConfig(
    taskMetadata: OnProcessTaskEvent,
    taskType: LayoutSetTaskType,
  ): AddLayoutSetMutationPayload {
    const elementId = taskMetadata.taskEvent.element.id;
    return {
      taskType,
      layoutSetConfig: { id: elementId, taskId: elementId },
    };
  }

  private handleGenericSigningTaskAdd(taskMetadata: OnProcessTaskEvent): void {
    this.addLayoutSet(this.createLayoutSetConfig(taskMetadata, 'signing'));
    const studioModeler = new StudioModeler(taskMetadata.taskEvent.element as Element);
    const dataTypeId = studioModeler.getDataTypeIdFromBusinessObject(
      'signing',
      taskMetadata.taskEvent.element.businessObject,
    );

    this.addDataTypeToAppMetadata({
      dataTypeId,
      taskId: taskMetadata.taskEvent.element.id,
      allowedContributors: [AllowedContributor.AppOwned],
    });
  }

  /**
   * Registers the data type the signing task's generated pdf is stored in
   * @param taskMetadata
   * @private
   */
  private addSigningPdfToApplicationMetadata(taskMetadata: OnProcessTaskEvent): void {
    const studioModeler = new StudioModeler(taskMetadata.taskEvent.element as Element);
    const signingPdfDataTypeId = studioModeler.getSigningPdfDataTypeIdFromBusinessObject(
      taskMetadata.taskEvent.element.businessObject,
    );

    if (!signingPdfDataTypeId) return;

    this.addDataTypeToAppMetadata({
      dataTypeId: signingPdfDataTypeId,
      taskId: taskMetadata.taskEvent.element.id,
      allowedContributors: [AllowedContributor.AppOwned],
      allowedContentTypes: [AllowedContentType.Pdf],
    });
  }

  private addSigneeStateToApplicationMetadata(taskMetadata: OnProcessTaskEvent): void {
    const studioModeler = new StudioModeler(taskMetadata.taskEvent.element as Element);
    const signeeStatesDataTypeId = studioModeler.getSigneeStatesDataTypeId(
      'signing',
      taskMetadata.taskEvent.element.businessObject,
    );

    if (!signeeStatesDataTypeId) return;

    this.addDataTypeToAppMetadata({
      dataTypeId: signeeStatesDataTypeId,
      taskId: taskMetadata.taskEvent.element.id,
      allowedContributors: [AllowedContributor.AppOwned],
    });
  }
}
