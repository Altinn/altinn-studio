import { TaskUtils } from '../../../../utils/taskUtils';

/**
 * The error that must be fixed before a service task type can be saved.
 *
 * Studio can only check that something was typed. Whether the value resolves to a registered
 * implementation is knowable only in the app's own code, where `IServiceTask` /
 * `IPipelineServiceTask` implementations are registered.
 * @param taskType the task type the developer typed.
 * @returns a translation key, or null when there is nothing to report.
 */
export const getServiceTaskTypeErrorKey = (taskType: string): string | null => {
  if (!taskType?.trim()) return 'validation_errors.required';
  return null;
};

/**
 * A warning, not an error: a built-in task type name is a legal thing to type, but the runtime
 * would then run that built-in behavior while the task is missing the configuration the built-in
 * type needs, leaving it half configured. Matched ignoring case, which is how the runtime resolves
 * a service task (`ServiceTaskLookupExtensions.FindServiceTask`).
 *
 * Only a change *into* a built-in type is worth saying. A task the palette created as one already
 * has that type when the panel opens, and telling its owner to go create it from the palette —
 * which is exactly what they did — would be both wrong and unanswerable.
 * @param taskType the task type the developer typed.
 * @param taskTypeWhenOpened the task type the panel was opened on.
 * @returns a translation key, or null when there is nothing to report.
 */
export const getServiceTaskTypeWarningKey = (
  taskType: string,
  taskTypeWhenOpened: string,
): string | null => {
  const trimmedTaskType = taskType?.trim();
  if (!trimmedTaskType) return null;
  if (trimmedTaskType === taskTypeWhenOpened?.trim()) return null;
  if (TaskUtils.isBuiltInTaskTypeIgnoringCase(trimmedTaskType))
    return 'process_editor.configuration_panel_service_task_type_built_in_warning';
  return null;
};
