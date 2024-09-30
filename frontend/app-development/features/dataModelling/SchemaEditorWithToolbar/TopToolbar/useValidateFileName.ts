import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { removeExtension } from 'app-shared/utils/filenameUtils';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

export const useValidateFileName = (appMetadata: ApplicationMetadata) => {
  const { t } = useTranslation();

  const fileNameRegEx: RegExp = /^[a-zA-Z][a-zA-Z0-9_.\-æÆøØåÅ ]*$/;
  const validateFileName = (fileName: string): boolean => {
    const fileNameWithoutExtension = removeExtension(fileName);
    const nameFollowsRegexRules = Boolean(fileName.match(fileNameRegEx));

    if (!nameFollowsRegexRules) {
      toast.error(t('app_data_modelling.upload_xsd_invalid_error'));
      return false;
    }
    return !Boolean(
      appMetadata.dataTypes?.find((dataType) => dataType.id === fileNameWithoutExtension),
    );
  };

  const getDuplicatedDataModelIdsInAppMetadata = (
    appMetadata: ApplicationMetadata,
    fileNameWithoutExtension: string,
  ): boolean => {
    return Boolean(
      appMetadata.dataTypes
        ?.filter((dataType) => dataType.appLogic?.classRef !== undefined)
        .find((dataType) => dataType.id === fileNameWithoutExtension),
    );
  };

  const getDuplicatedDataTypeIdNotBeingDataModelInAppMetadata = (
    appMetadata: ApplicationMetadata,
    fileNameWithoutExtension: string,
  ): boolean => {
    return Boolean(
      appMetadata.dataTypes
        ?.filter((dataType) => dataType.appLogic?.classRef === undefined)
        .find((dataType) => dataType.id.toLowerCase() === fileNameWithoutExtension.toLowerCase()),
    );
  };

  return {
    validateFileName,
    getDuplicatedDataModelIdsInAppMetadata,
    getDuplicatedDataTypeIdNotBeingDataModelInAppMetadata,
  };
};
