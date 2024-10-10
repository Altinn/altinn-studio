import { removeExtension } from 'app-shared/utils/filenameUtils';
import { useTranslation } from 'react-i18next';

export const useValidateFileNameUtils = (optionListIds: string[]) => {
  const { t } = useTranslation();

  const fileNameRegEx: RegExp = /^[a-zA-Z][a-zA-Z0-9_.\-æÆøØåÅ ]*$/;
  const validateFileName = (fileName: string): boolean => {
    const fileNameWithoutExtension = removeExtension(fileName);
    const nameFollowsRegexRules = Boolean(fileName.match(fileNameRegEx));

    if (!nameFollowsRegexRules) {
      alert(t('app_data_modelling.upload_xsd_invalid_name_error'));
      return false;
    }
    return !Boolean(optionListIds.find((option) => option === fileNameWithoutExtension));
  };

  const getDuplicatedOptionIds = (
    optionListIds: string[],
    fileNameWithoutExtension: string,
  ): boolean => {
    return Boolean(optionListIds.find((option) => option === fileNameWithoutExtension));
  };

  return {
    validateFileName,
    getDuplicatedOptionIds,
  };
};
