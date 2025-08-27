import React from 'react';
import { StudioTextfield, StudioNativeSelect } from '@studio/components-legacy';
import { StudioProperty } from '@studio/components';
import { LinkIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import classes from './SubformDataModel.module.css';

export type SubformDataModelProps = {
  setDisplayDataModelInput: (setDisplayDataModelInput: boolean) => void;
  displayDataModelInput: boolean;
  setSelectedDataModel: (dataModelId: string) => void;
  dataModelIds?: string[];
  validateName: (name: string) => void;
  dataModelNameError: string;
  setIsTextfieldEmpty: (isEmpty: boolean) => void;
};

export const SubformDataModel = ({
  setDisplayDataModelInput,
  setSelectedDataModel,
  displayDataModelInput,
  dataModelIds,
  validateName,
  dataModelNameError,
  setIsTextfieldEmpty,
}: SubformDataModelProps): React.ReactElement => {
  const { t } = useTranslation();

  const handleNewDataModel = (dataModelId: string) => {
    validateName(dataModelId);
    setIsTextfieldEmpty(dataModelId === '');
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
          onChange={(e) => handleNewDataModel(e.target.value)}
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
