import type { Policy } from 'app-shared/types/Policy';
import type { OnProcessTaskEvent } from '../types/OnProcessTask';
import { PaymentPolicyBuilder } from 'app-development/utils/policy';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { getLayoutSetIdFromTaskId } from './bpmnHandlerUtils';
import { StudioModeler } from '../utils/bpmnModeler/StudioModeler';
import type { Element } from 'bpmn-js/lib/model/Types';
import { TaskUtils } from '../utils/taskUtils';
import { BpmnTypeEnum } from '../enum/BpmnTypeEnum';
import type { BpmnBusinessObjectEditor } from '../types/BpmnBusinessObjectEditor';

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

  public handleOnProcessTaskRemove({ taskEvent, taskType }: OnProcessTaskEvent): void {
    if (!['data', 'payment', 'signing', 'pdf', 'subformPdf'].includes(taskType)) return;

    const { id, businessObject } = taskEvent.element;
    const layoutSetId = getLayoutSetIdFromTaskId(id, this.layoutSets ?? []);
    if (layoutSetId) this.deleteLayoutSet({ layoutSetIdToUpdate: layoutSetId });

    if (taskType === 'payment' || taskType === 'signing') {
      const studioModeler = new StudioModeler();
      const otherTasks = [
        ...studioModeler.getElementsByType(BpmnTypeEnum.Task),
        ...studioModeler.getElementsByType(BpmnTypeEnum.ServiceTask),
      ].filter((task) => task.id !== id);
      const referencedDataTypes = new Set(
        otherTasks.flatMap((task) => getGeneratedDataTypeIds(task.businessObject)),
      );
      for (const dataTypeId of new Set(getGeneratedDataTypeIds(businessObject))) {
        if (!referencedDataTypes.has(dataTypeId)) {
          this.deleteDataTypeFromAppMetadata({ dataTypeId });
        }
      }

      const signatureDataType =
        TaskUtils.getTaskExtensionFromBusinessObject(businessObject)?.signatureConfig
          ?.signatureDataType;
      if (
        taskType === 'signing' &&
        signatureDataType &&
        !referencedDataTypes.has(signatureDataType)
      ) {
        this.removeSignatureReferences(otherTasks, signatureDataType);
      }
    }

    if (taskType === 'payment') {
      const ruleId = new PaymentPolicyBuilder(this.org, this.app).getPolicyRuleId(id);
      this.mutateApplicationPolicy({
        ...this.currentPolicy,
        rules: this.currentPolicy.rules.filter((rule) => rule.ruleId !== ruleId),
      });
    }
  }

  private removeSignatureReferences(tasks: Element[], signatureDataType: string): void {
    for (const task of tasks) {
      const taskExtension = TaskUtils.getTaskExtension(task);
      if (taskExtension?.taskType !== 'signing') continue;
      const uniqueFromSignatures = taskExtension.signatureConfig?.uniqueFromSignaturesInDataTypes;
      if (uniqueFromSignatures?.dataTypes) {
        uniqueFromSignatures.dataTypes = uniqueFromSignatures.dataTypes.filter(
          ({ dataType }) => dataType !== signatureDataType,
        );
      }
    }
  }
}

function getGeneratedDataTypeIds(businessObject: BpmnBusinessObjectEditor): string[] {
  const { signatureConfig, paymentConfig } =
    TaskUtils.getTaskExtensionFromBusinessObject(businessObject) ?? {};
  return [
    signatureConfig?.signatureDataType,
    signatureConfig?.signingPdfDataType,
    signatureConfig?.signeeStatesDataTypeId,
    paymentConfig?.paymentDataType,
    paymentConfig?.paymentReceiptPdfDataType,
  ].filter(Boolean);
}
