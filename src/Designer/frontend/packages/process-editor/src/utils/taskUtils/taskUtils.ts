import type { BpmnTaskType, BuiltInBpmnTaskType } from '../../types/BpmnTaskType';
import { builtInBpmnTaskTypes } from '../../types/BpmnTaskType';
import type { Element } from 'bpmn-js/lib/model/Types';
import { StringUtils } from '@studio/pure-functions';

export class TaskUtils {
  public static isSigningTask(taskType: BpmnTaskType): boolean {
    return taskType === 'signing';
  }

  /**
   * Whether the task type is one the app runtime ships with, and therefore one Studio has a
   * dedicated panel and icon for. Anything else is a service task the app implements itself.
   * @param taskType the task type to check.
   * @returns true if the task type is built in.
   */
  public static isBuiltInTaskType(taskType: BpmnTaskType): taskType is BuiltInBpmnTaskType {
    return builtInBpmnTaskTypes.some((builtInTaskType) => builtInTaskType === taskType);
  }

  /**
   * The same check, ignoring case, which is how the runtime resolves a service task
   * (`ServiceTaskLookupExtensions.FindServiceTask` compares with `OrdinalIgnoreCase`). Use this
   * when warning a developer that a type they typed collides with a built-in one; use
   * {@link isBuiltInTaskType} when deciding which panel to render, since that follows the exact
   * value Studio itself writes.
   * @param taskType the task type to check.
   * @returns true if the task type matches a built in one apart from casing.
   */
  public static isBuiltInTaskTypeIgnoringCase(taskType: BpmnTaskType): boolean {
    return builtInBpmnTaskTypes.some((builtInTaskType) =>
      StringUtils.areCaseInsensitiveEqual(builtInTaskType, taskType),
    );
  }

  /**
   * A signing task is user controlled when its signature configuration is shaped for runtime
   * delegated signing. The app runtime enables that when `signeeProviderId` and
   * `signeeStatesDataTypeId` are both set, and rejects a configuration where only one of them is
   * (see `SigningProcessTask.ValidateSigningConfiguration` in Altinn.App.Core).
   *
   * The two properties therefore agree on every valid configuration, and differ only on invalid
   * ones. Recognizing either is what serves the developer: a task that declares just one of them
   * is a delegated signing task waiting to be completed, and the panel should offer the fields
   * that complete it rather than hide them.
   *
   * Presence, not truthiness, is the test: the palette seeds `signeeProviderId` empty until a
   * developer picks an implementation, and an empty element deserialises to an empty string, which
   * the runtime's null checks treat as set.
   * @param element the bpmn element to inspect.
   * @returns true if the element is configured for user controlled signing.
   */
  public static isUserControlledSigning(element: Element): boolean {
    const signatureConfig =
      element?.businessObject?.extensionElements?.values?.[0]?.signatureConfig;
    return (
      isPropertySet(signatureConfig?.signeeStatesDataTypeId) ||
      isPropertySet(signatureConfig?.signeeProviderId)
    );
  }
}

const isPropertySet = (value: string | undefined | null): boolean =>
  value !== undefined && value !== null;
