import type { BpmnTaskType } from '../../types/BpmnTaskType';

/**
 * Returns the title to show in the config panel when a task is selected.
 * @param taskType the task type of the bpmn.
 * @returns the correct title key.
 *
 */
export const getConfigTitleKey = (taskType: BpmnTaskType) => {
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
