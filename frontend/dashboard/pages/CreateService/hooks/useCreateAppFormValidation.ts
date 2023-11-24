import { validateRepoName as isRepoNameValid } from '../../../utils/repoUtils';
import { useTranslation } from 'react-i18next';

type ValidationResult = {
  errorMessage: string | null;
  isValid: boolean;
};

type UseCreateAppFormValidation = {
  validateRepoOwnerName: (owner: string | undefined) => ValidationResult;
  validateRepoName: (repoName: string | undefined) => ValidationResult;
};
export const useCreateAppFormValidation = (): UseCreateAppFormValidation => {
  const { t } = useTranslation();

  const validateRepoOwnerName = (owner: string | undefined) => {
    if (!owner) {
      return {
        errorMessage: t('dashboard.field_cannot_be_empty'),
        isValid: false,
      };
    }
    return {
      errorMessage: null,
      isValid: true,
    };
  };
  const validateRepoName = (repoName: string | undefined): ValidationResult => {
    if (!repoName) {
      return {
        errorMessage: t('dashboard.field_cannot_be_empty'),
        isValid: false,
      };
    }

    const MAX_ALLOWED_NAME_LENGTH: number = 30;
    if (repoName.length > MAX_ALLOWED_NAME_LENGTH) {
      return {
        errorMessage: t('dashboard.service_name_is_too_long'),
        isValid: false,
      };
    }

    if (!isRepoNameValid(repoName)) {
      return {
        errorMessage: t('dashboard.service_name_has_illegal_characters'),
        isValid: false,
      };
    }

    return {
      errorMessage: null,
      isValid: true,
    };
  };

  return {
    validateRepoOwnerName,
    validateRepoName,
  };
};
