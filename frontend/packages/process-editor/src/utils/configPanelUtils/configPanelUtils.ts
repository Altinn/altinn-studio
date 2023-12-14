import { BpmnTaskType } from '../../types/BpmnTaskType';

/**
 * Returns the title to show in the config panel when a task is selected.
 * @param taskType the task type of the bpmn.
 * @returns the correct title key.
 *
 */
export const getConfigTitleKey = (taskType: BpmnTaskType) => {
  switch (taskType) {
    case 'data':
      return 'process_editor.configuration_panel_data_task';
    case 'confirmation':
      return 'process_editor.configuration_panel_confirmation_task';
    case 'feedback':
      return 'process_editor.configuration_panel_feedback_task';
    case 'signing':
      return 'process_editor.configuration_panel_signing_task';
  }
};

/**
 * Returns the text to show in the config panel helptext based on the tasktype
 * @param taskType the task type of the bpmn
 * @returns the correct helptext key
 */
export const getConfigTitleHelpTextKey = (taskType: BpmnTaskType) => {
  switch (taskType) {
    case 'data':
      return 'process_editor.configuration_panel_header_help_text_data';
    case 'confirmation':
      return 'process_editor.configuration_panel_header_help_text_confirmation';
    case 'feedback':
      return 'process_editor.configuration_panel_header_help_text_feedback';
    case 'signing':
      return 'process_editor.configuration_panel_header_help_text_signing';
  }
};
