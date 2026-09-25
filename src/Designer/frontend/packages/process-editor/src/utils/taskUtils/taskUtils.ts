import type { BpmnTaskType, BuiltInBpmnTaskType } from '../../types/BpmnTaskType';
import { builtInBpmnTaskTypes } from '../../types/BpmnTaskType';
import type { Element, ModdleElement } from 'bpmn-js/lib/model/Types';

const TASK_EXTENSION_TYPE = 'altinn:TaskExtension';

export class TaskUtils {
  public static isSigningTask(taskType: BpmnTaskType): boolean {
    return taskType === 'signing';
  }

  /**
   * The `<altinn:taskExtension>` node a task's configuration lives in, found by type rather than by
   * position since `bpmn:extensionElements` may carry extensions from other tools too.
   */
  public static getTaskExtension(element: Element): ModdleElement | undefined {
    return TaskUtils.getTaskExtensionFromBusinessObject(element?.businessObject);
  }

  /** Same lookup for a caller holding a typed business object, so the return type stays checked. */
  public static getTaskExtensionFromBusinessObject<TExtensionValue extends { $type?: string }>(
    businessObject: { extensionElements?: { values?: TExtensionValue[] } } | undefined,
  ): TExtensionValue | undefined {
    return businessObject?.extensionElements?.values?.find(
      (value) => value?.$type === TASK_EXTENSION_TYPE,
    );
  }

  /** Whether the task type is one the app runtime ships with; anything else is the app's own. */
  public static isBuiltInTaskType(taskType: BpmnTaskType): taskType is BuiltInBpmnTaskType {
    return builtInBpmnTaskTypes.some((builtInTaskType) => builtInTaskType === taskType);
  }

  /**
   * The runtime enables delegated signing when both `signeeProviderId` and `signeeStatesDataTypeId`
   * are set. Either one is enough here, so that a half-configured task is offered the fields that
   * complete it. Presence rather than truthiness: the palette seeds `signeeProviderId` empty.
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
