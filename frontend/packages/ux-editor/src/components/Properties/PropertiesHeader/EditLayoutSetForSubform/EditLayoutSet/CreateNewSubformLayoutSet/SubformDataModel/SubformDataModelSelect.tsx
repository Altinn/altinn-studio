import React from 'react';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { StudioNativeSelect } from '@studio/components';

export interface ISubformDataModelSelectProps {
  selectedDataType: string;
  setSelectedDataType: (dataType: string) => void;
  disabled?: boolean;
}

export const SubformDataModelSelect = ({
  selectedDataType,
  setSelectedDataType,
  disabled,
}: ISubformDataModelSelectProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: dataModelIds } = useAppMetadataModelIdsQuery(org, app, false);

  function handleChange(dataType: string) {
    setSelectedDataType(dataType);
  }

  return (
    <StudioNativeSelect
      label={t('ux_editor.component_properties.subform.data_model_binding_label')}
      onChange={(e) => handleChange(e.target.value)}
      value={selectedDataType}
      size='small'
      disabled={disabled}
    >
      <option value='' hidden></option>
      {dataModelIds ? (
        dataModelIds.map((dataModelId) => (
          <option value={dataModelId} key={dataModelId}>
            {dataModelId}
          </option>
        ))
      ) : (
        <option disabled>
          {t('ux_editor.component_properties.subform.data_model_empty_messsage')}
        </option>
      )}
    </StudioNativeSelect>
  );
};
