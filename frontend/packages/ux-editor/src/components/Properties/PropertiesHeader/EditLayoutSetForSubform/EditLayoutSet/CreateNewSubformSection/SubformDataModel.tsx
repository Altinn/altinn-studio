import React from 'react';
import { StudioTextfield, StudioNativeSelect, StudioProperty } from '@studio/components';
import { LinkIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
import classes from './SubformDataModel.module.css';

export type SubformDataModelProps = {
  setDisplayDataModelInput: (setDisplayDataModelInput: boolean) => void;
  setNewDataModel: (dataModelId: string) => void;
  displayDataModelInput: boolean;
  setSelectedDataModel: (dataModelId: string) => void;
};

export const SubformDataModel = ({
  setDisplayDataModelInput,
  setSelectedDataModel,
  setNewDataModel,
  displayDataModelInput,
}: SubformDataModelProps): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: dataModelIds } = useAppMetadataModelIdsQuery(org, app, false);

  const handleDataModel = (dataModelId: string) => {
    // TODO: https://github.com/Altinn/altinn-studio/issues/14184
    setNewDataModel(dataModelId);
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
