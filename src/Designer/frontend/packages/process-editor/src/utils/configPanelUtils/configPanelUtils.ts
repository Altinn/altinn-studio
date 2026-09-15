import { type BpmnTaskType } from '../../types/BpmnTaskType';
import { type LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { TaskUtils } from '../taskUtils';

/**
 * Returns the title to show in the config panel when a task is selected.
 * An element with no task type at all, and a task type the app implements itself, each share one
 * generic title, since neither has a key of its own.
 * @param taskType the task type of the bpmn.
 * @returns the correct title key.
 *
 */
export const getConfigTitleKey = (taskType: BpmnTaskType): string => {
  if (!hasTaskType(taskType)) return 'process_editor.configuration_panel_missing_task';
  if (!TaskUtils.isBuiltInTaskType(taskType))
    return 'process_editor.configuration_panel_custom_service_task';
  return `process_editor.configuration_panel_${taskType}_task`;
};

/**
 * Returns the text to show in the config panel helptext based on the tasktype
 * @param taskType the task type of the bpmn
 * @returns the correct helptext key
 */
export const getConfigTitleHelpTextKey = (taskType: BpmnTaskType): string => {
  if (!hasTaskType(taskType)) return 'process_editor.configuration_panel_header_help_text_missing';
  if (!TaskUtils.isBuiltInTaskType(taskType))
    return 'process_editor.configuration_panel_header_help_text_custom_service_task';
  return `process_editor.configuration_panel_header_help_text_${taskType}`;
};

/**
 * An empty task type is a task type: it is what the palette writes for a service task the developer
 * has yet to name, and it must get the custom service task texts rather than the missing ones.
 */
const hasTaskType = (taskType: BpmnTaskType): boolean =>
  taskType !== null && taskType !== undefined;

/**
 * Returns either error message based on the invalid character or undefined if no invalid characters are found.
 * @param newId the new id to check for invalid characters.
 * @returns either 'invalidLetter' or 'invalidSymbol' if invalid characters are found, otherwise undefined.
 */

type InvalidCharacter = 'invalidLetter' | 'invalidSymbol';

export const checkForInvalidCharacters = (newId: string): InvalidCharacter | undefined => {
  const regexLetters = /[a-zA-Z]+$/;
  const regexSymbol = /^[0-9_-]+$/;

  for (const char of newId) {
    if (char.toUpperCase() !== char.toLowerCase()) {
      if (!regexLetters.test(char)) {
        return 'invalidLetter';
      }
    }

    if (char.toUpperCase() === char.toLowerCase()) {
      if (!regexSymbol.test(char)) {
        return 'invalidSymbol';
      }
    }
  }
  return undefined;
};

/**
 * Returns the data type from a layout set if the id of the layout set matches the existing id sent in
 * @param layoutSets the layout sets to look through
 * @param existingId the existing it to use for lookup
 * @returns the data type if found, undefined otherwise
 */
export const getDataTypeFromLayoutSetsWithExistingId = (
  layoutSets: LayoutSets,
  existingId: string,
): string | undefined => {
  return layoutSets.find((layoutSet) => layoutSet.id === existingId)?.dataType;
};
