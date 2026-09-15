import { useTranslation } from 'react-i18next';
import { getServiceTaskTypeErrorKey, getServiceTaskTypeWarningKey } from './serviceTaskTypeUtils';

type UseValidateServiceTaskTypeResult = {
  validateServiceTaskType: (taskType: string) => string;
  getServiceTaskTypeWarning: (taskType: string, taskTypeWhenOpened: string) => string;
};

export const useValidateServiceTaskType = (): UseValidateServiceTaskTypeResult => {
  const { t } = useTranslation();

  const validateServiceTaskType = (taskType: string): string => {
    const errorKey = getServiceTaskTypeErrorKey(taskType);
    return errorKey ? t(errorKey) : '';
  };

  const getServiceTaskTypeWarning = (taskType: string, taskTypeWhenOpened: string): string => {
    const warningKey = getServiceTaskTypeWarningKey(taskType, taskTypeWhenOpened);
    return warningKey ? t(warningKey) : '';
  };

  return { validateServiceTaskType, getServiceTaskTypeWarning };
};
