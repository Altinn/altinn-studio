import { PaymentPolicyBuilder } from 'app-development/utils/policy';
import type { OnProcessTaskEvent } from '../types/OnProcessTask';
import type { Policy } from 'app-shared/types/Policy';
import type { AddLayoutSetMutation } from 'app-development/hooks/mutations/useAddLayoutSetMutation';
import type { BpmnTaskType as LayoutSetTaskType } from 'app-shared/types/BpmnTaskType';
import { TaskUtils } from '../utils/taskUtils';

export enum AllowedContributor {
  AppOwned = 'app:owned',
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
      allowedContributors?: string[];
      allowedContentTypes?: string[];
    }) => void,
  ) {}

  public handleOnProcessTaskAdd({ taskEvent, taskType }: OnProcessTaskEvent): void {
    if (taskType !== 'data' && taskType !== 'payment' && taskType !== 'signing') return;

    const { id, businessObject } = taskEvent.element;
    this.addLayoutSet({
      taskType: taskType as LayoutSetTaskType,
      layoutSetConfig: { id, taskId: id },
    });
    const taskExtension = TaskUtils.getTaskExtensionFromBusinessObject(businessObject);

    if (taskType === 'payment') {
      const paymentConfig = taskExtension?.paymentConfig;
      this.addDataType(paymentConfig?.paymentDataType, id);
      this.addDataType(paymentConfig?.paymentReceiptPdfDataType, id, 'application/pdf');

      const paymentPolicy = new PaymentPolicyBuilder(this.org, this.app).getDefaultPaymentPolicy(
        id,
      );
      this.mutateApplicationPolicy({
        ...this.currentPolicy,
        rules: [...this.currentPolicy.rules, ...paymentPolicy.rules],
      });
    }

    if (taskType === 'signing') {
      const signatureConfig = taskExtension?.signatureConfig;
      this.addDataType(signatureConfig?.signatureDataType, id);
      this.addDataType(signatureConfig?.signingPdfDataType, id, 'application/pdf');
      this.addDataType(signatureConfig?.signeeStatesDataTypeId, id);
    }
  }

  private addDataType(dataTypeId: string | undefined, taskId: string, contentType?: string): void {
    if (!dataTypeId) return;
    this.addDataTypeToAppMetadata({
      dataTypeId,
      taskId,
      allowedContributors: [AllowedContributor.AppOwned],
      ...(contentType && { allowedContentTypes: [contentType] }),
    });
  }
}
