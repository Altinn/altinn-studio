import type { BpmnTaskType } from '../../types/BpmnTaskType';

/**
 * Returns the title to show in the config panel when a task is selected.
 * @param taskType the task type of the bpmn.
 * @returns the correct title key.
 *
 */
export const getConfigTitleKey = (taskType: BpmnTaskType) => {
  if (taskType === 'endEvent') return 'process_editor.configuration_panel_end_event';
  return `process_editor.configuration_panel_${taskType ?? 'missing'}_task`;
};

/**
 * Returns the text to show in the config panel helptext based on the tasktype
 * @param taskType the task type of the bpmn
 * @returns the correct helptext key
 */
export const getConfigTitleHelpTextKey = (taskType: BpmnTaskType) => {
  return `process_editor.configuration_panel_header_help_text_${taskType}`;
};
