import type { BpmnTaskType } from '../../types/BpmnTaskType';
import type { Element } from 'bpmn-js/lib/model/Types';

export class TaskUtils {
  public static isSigningTask(taskType: BpmnTaskType): boolean {
    return taskType === 'signing';
  }

  /**
   * A signing task is user controlled when its signature configuration is shaped for runtime
   * delegated signing. The app runtime enables that when `signeeProviderId` and
   * `signeeStatesDataTypeId` are both set, and rejects a configuration where only one of them is
   * (see `SigningProcessTask.ValidateSigningConfiguration` in Altinn.App.Core).
   *
   * The two properties therefore agree on every valid configuration, and differ only on invalid
   * ones. Recognising either is what serves the developer: a task that declares just one of them
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
