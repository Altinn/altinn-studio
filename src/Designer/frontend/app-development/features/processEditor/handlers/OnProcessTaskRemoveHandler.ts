import type { Policy } from 'app-shared/types/Policy';
import type { OnProcessTaskEvent } from '@altinn/process-editor/types/OnProcessTask';
import { PaymentPolicyBuilder } from '../../../utils/policy';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { getLayoutSetIdFromTaskId } from '../bpmnHandlerUtils/bpmnHandlerUtils';
import { StudioModeler } from '@altinn/process-editor/utils/bpmnModeler/StudioModeler';
import type { Element } from 'bpmn-js/lib/model/Types';

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

  public handleOnProcessTaskRemove(taskMetadata: OnProcessTaskEvent): void {
    if (taskMetadata.taskType === 'data') {
      this.handleDataTaskRemove(taskMetadata);
    }

    if (taskMetadata.taskType === 'payment') {
      this.handlePaymentTaskRemove(taskMetadata);
    }

    if (taskMetadata.taskType === 'signing') {
      this.handleSigningTaskRemove(taskMetadata);
    }

    if (taskMetadata.taskType === 'userControlledSigning') {
      this.handleUserControlledSigningTaskRemove(taskMetadata);
    }
  }

  private handleDataTaskRemove(taskMetadata: OnProcessTaskEvent): void {
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

  private handlePaymentTaskRemove(taskMetadata: OnProcessTaskEvent): void {
    const studioModeler = new StudioModeler(taskMetadata.taskEvent.element as unknown as Element);
    const dataTypeId = studioModeler.getDataTypeIdFromBusinessObject(
      taskMetadata.taskType,
      taskMetadata.taskEvent.element.businessObject,
    );
    this.deleteDataTypeFromAppMetadata({
      dataTypeId,
    });

    const receiptPdfDataTypeId = studioModeler.getReceiptPdfDataTypeIdFromBusinessObject(
      taskMetadata.taskType,
      taskMetadata.taskEvent.element.businessObject,
    );
    this.deleteDataTypeFromAppMetadata({
      dataTypeId: receiptPdfDataTypeId,
    });

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

  private handleSigningTaskRemove(taskMetadata: OnProcessTaskEvent): void {
    this.handleGenericSigningTaskRemove(taskMetadata);
  }

  private handleUserControlledSigningTaskRemove(taskMetadata: OnProcessTaskEvent): void {
    this.handleGenericSigningTaskRemove(taskMetadata);
    this.handleRemoveSigneeState(taskMetadata);
  }

  private removeDeletedSignatureTypeFromTasks(
    deletedSigningTask: OnProcessTaskEvent,
    studioModeler: StudioModeler,
  ): void {
    const signatureDataType =
      deletedSigningTask.taskEvent.element.businessObject.extensionElements.values[0]
        .signatureConfig.signatureDataType;

    const tasks = studioModeler.getAllTasksByType('bpmn:Task');
    const signingTasksToUpdate = tasks.filter(
      ({
        businessObject: {
          extensionElements: { values },
        },
      }) => {
        const { taskType, signatureConfig } = values[0];
        return (
          taskType === 'signing' &&
          signatureConfig?.uniqueFromSignaturesInDataTypes?.dataTypes?.some(
            ({ dataType }) => dataType === signatureDataType,
          )
        );
      },
    );

    signingTasksToUpdate.forEach((element) => {
      const uniqueFromSignaturesInDataTypes =
        element.businessObject.extensionElements.values[0].signatureConfig
          .uniqueFromSignaturesInDataTypes;

      uniqueFromSignaturesInDataTypes.dataTypes = uniqueFromSignaturesInDataTypes.dataTypes.filter(
        (dataType) => dataType.dataType !== signatureDataType,
      );
    });
  }

  private handleGenericSigningTaskRemove(taskMetadata: OnProcessTaskEvent): void {
    const studioModeler = new StudioModeler(taskMetadata.taskEvent.element as unknown as Element);
    const dataTypeId = studioModeler.getDataTypeIdFromBusinessObject(
      taskMetadata.taskType,
      taskMetadata.taskEvent.element.businessObject,
    );
    this.deleteDataTypeFromAppMetadata({
      dataTypeId,
    });

    const layoutSetId = getLayoutSetIdFromTaskId(
      taskMetadata.taskEvent.element.id,
      this.layoutSets,
    );

    if (layoutSetId) {
      this.deleteLayoutSet({
        layoutSetIdToUpdate: layoutSetId,
      });
    }

    this.removeDeletedSignatureTypeFromTasks(taskMetadata, studioModeler);
  }

  private handleRemoveSigneeState(taskMetadata: OnProcessTaskEvent): void {
    const studioModeler = new StudioModeler(taskMetadata.taskEvent.element as unknown as Element);
    const dataTypeId = studioModeler.getSigneeStatesDataTypeId(
      taskMetadata.taskType,
      taskMetadata.taskEvent.element.businessObject,
    );
    this.deleteDataTypeFromAppMetadata({
      dataTypeId,
    });
  }
}
