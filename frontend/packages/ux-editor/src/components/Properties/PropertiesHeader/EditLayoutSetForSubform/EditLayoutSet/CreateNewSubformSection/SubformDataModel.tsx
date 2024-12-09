import React, { useEffect } from 'react';
import { StudioTextfield, StudioNativeSelect, StudioProperty } from '@studio/components';
import { LinkIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
import classes from './SubformDataModel.module.css';
import { useValidateSchemaName } from 'app-shared/hooks/useValidateSchemaName';
import { extractDataTypeNamesFromAppMetadata } from 'app-development/features/dataModelling/SchemaEditorWithToolbar/TopToolbar/utils/validationUtils';
import { useAppMetadataQuery } from 'app-shared/hooks/queries';

export type SubformDataModelProps = {
  setDisplayDataModelInput: (setDisplayDataModelInput: boolean) => void;
  setNewDataModel: (dataModelId: string) => void;
  displayDataModelInput: boolean;
  setSelectedDataModel: (dataModelId: string) => void;
  setDataModelError?: (error: string | undefined) => void;
};

export const SubformDataModel = ({
  setDisplayDataModelInput,
  setSelectedDataModel,
  setNewDataModel,
  displayDataModelInput,
  setDataModelError,
}: SubformDataModelProps): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: dataModelIds } = useAppMetadataModelIdsQuery(org, app, false);

  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const dataTypeNames = extractDataTypeNamesFromAppMetadata(appMetadata);
  const { validateName, nameError: dataModelNameError } = useValidateSchemaName(
    dataModelIds,
    dataTypeNames,
  );

  useEffect(() => {
    setDataModelError(dataModelNameError);
  }, [dataModelNameError, setDataModelError]);

  const handleDataModel = (dataModelId: string) => {
    validateName(dataModelId);
    if (!dataModelNameError) setNewDataModel(dataModelId);
  };

  const handleDisplayInput = () => {
    setDisplayDataModelInput(true);
  };

  return (
    <>
      <StudioNativeSelect
        label={t('ux_editor.component_properties.subform.data_model_binding_label')}
        onChange={(e) => setSelectedDataModel(e.target.value)}
        size='small'
        disabled={displayDataModelInput}
        name='subformDataModel'
      >
        <option value='' hidden />
        {dataModelIds ? (
          dataModelIds.map((dataModelId) => (
            <option value={dataModelId} key={dataModelId}>
              {dataModelId}
            </option>
          ))
        ) : (
          <option value=''>
            {t('ux_editor.component_properties.subform.data_model_empty_messsage')}
          </option>
        )}
      </StudioNativeSelect>
      {displayDataModelInput ? (
        <StudioTextfield
          name='newSubformDataModel'
          label={t('ux_editor.component_properties.subform.create_new_data_model_label')}
          size='sm'
          onChange={(e) => handleDataModel(e.target.value)}
          error={dataModelNameError}
        />
      ) : (
        <StudioProperty.Button
          icon={<LinkIcon />}
          className={classes.displayDataModelButton}
          onClick={handleDisplayInput}
          property={t('ux_editor.component_properties.subform.create_new_data_model')}
        />
      )}
    </>
  );
};
