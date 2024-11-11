import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractModelNamesFromMetadataList } from '../../../../utils/metadataUtils';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { DataModelMetadata } from 'app-shared/types/DataModelMetadata';

export const useValidateSchemaName = (dataModels: DataModelMetadata[]) => {
  const [nameError, setNameError] = useState('');
  const { org, app } = useStudioEnvironmentParams();
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const { t } = useTranslation();

  const nameValidationRegex = /^[a-zA-Z][a-zA-Z0-9_\-æÆøØåÅ]*$/;

  const modelNames = extractModelNamesFromMetadataList(dataModels);

  const dataTypeWithNameExists = (id: string) => {
    return appMetadata?.dataTypes?.find(
      (dataType) => dataType.id.toLowerCase() === id.toLowerCase(),
    );
  };

  const validateName = (name: string): void => {
    if (!name) {
      setNameError(t('validation_errors.required'));
      return;
    }
    if (!name.match(nameValidationRegex)) {
      setNameError(t('schema_editor.invalid_datamodel_name'));
      return;
    }
    if (modelNames.includes(name)) {
      setNameError(t('schema_editor.error_model_name_exists', { newModelName: name }));
      return;
    }
    if (dataTypeWithNameExists(name)) {
      setNameError(t('schema_editor.error_data_type_name_exists'));
      return;
    }
    setNameError('');
  };

  return { validateName, nameError };
};
