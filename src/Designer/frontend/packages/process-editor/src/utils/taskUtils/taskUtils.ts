import type { BpmnTaskType, BuiltInBpmnTaskType } from '../../types/BpmnTaskType';
import { builtInBpmnTaskTypes } from '../../types/BpmnTaskType';
import type { Element, ModdleElement } from 'bpmn-js/lib/model/Types';

const TASK_EXTENSION_TYPE = 'altinn:TaskExtension';

export class TaskUtils {
  public static isSigningTask(taskType: BpmnTaskType): boolean {
    return taskType === 'signing';
  }

  /** Find the task extension by type. Other tools can add extension elements before it. */
  public static getTaskExtension(element: Element): ModdleElement | undefined {
    return TaskUtils.getTaskExtensionFromBusinessObject(element?.businessObject);
  }

  public static getTaskExtensionFromBusinessObject<TExtensionValue extends { $type?: string }>(
    businessObject: { extensionElements?: { values?: TExtensionValue[] } } | undefined,
  ): TExtensionValue | undefined {
    return businessObject?.extensionElements?.values?.find(
      (value) => value?.$type === TASK_EXTENSION_TYPE,
    );
  }

  public static isBuiltInTaskType(taskType: BpmnTaskType): taskType is BuiltInBpmnTaskType {
    return builtInBpmnTaskTypes.some((builtInTaskType) => builtInTaskType === taskType);
  }

  /**
   * Show delegated signing fields when either setting exists, so users can complete partial
   * configuration. Check for presence because the palette creates an empty signeeProviderId. The
   * runtime requires both settings.
   */
  public static isUserControlledSigning(element: Element): boolean {
    const signatureConfig = TaskUtils.getTaskExtension(element)?.signatureConfig;
    return (
      isPropertySet(signatureConfig?.signeeStatesDataTypeId) ||
      isPropertySet(signatureConfig?.signeeProviderId)
    );
  }
}

const isPropertySet = (value: string | undefined | null): boolean =>
  value !== undefined && value !== null;
