import { useTaskIds } from './useTaskIds';
import { checkForInvalidCharacters } from '../utils/configPanelUtils';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../contexts/BpmnContext';
import { StringUtils } from 'libs/studio-pure-functions/src';

export const useValidateBpmnTaskId = () => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const otherTaskIds = useTaskIds().filter((id) => id !== bpmnDetails.id);
  const validateBpmnTaskId = (newId: string): string => {
    const errorMessages = {
      unique: t('process_editor.validation_error.id_not_unique'),
      required: t('validation_errors.required'),
      maxLength: t('process_editor.validation_error.id_max_length', { 0: 50 }),
      reservedWord: t('process_editor.validation_error.id_reserved', {
        0: 'starte ID-en med Custom',
      }),
      noSpacing: t('process_editor.validation_error.no_spacing'),
      invalidLetter: t('process_editor.validation_error.letters'),
      invalidSymbol: t('process_editor.validation_error.symbols'),
    };

    const validationRules = [
      {
        name: 'unique',
        condition: otherTaskIds.some((taskId) =>
          StringUtils.areCaseInsensitiveEqual(taskId, newId),
        ),
      },
      { name: 'required', condition: newId.length === 0 },
      { name: 'reservedWord', condition: newId.toLowerCase().startsWith('custom') },
      { name: 'maxLength', condition: newId.length > 50 },
      { name: 'noSpacing', condition: newId.includes(' ') },
      {
        name: checkForInvalidCharacters(newId),
        condition: checkForInvalidCharacters(newId),
      },
    ];

    for (const rule of validationRules) {
      if (rule.condition) {
        return errorMessages[rule.name];
      }
    }

    return '';
  };

  return { validateBpmnTaskId };
};
