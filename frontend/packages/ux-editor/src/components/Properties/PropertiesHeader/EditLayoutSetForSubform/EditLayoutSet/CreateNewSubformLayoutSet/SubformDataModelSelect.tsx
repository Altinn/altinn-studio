import React from 'react';
import { useAppMetadataModelIdsQuery } from 'app-shared/hooks/queries/useAppMetadataModelIdsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { StudioNativeSelect } from '@studio/components';

export interface ISubformDataModelSelectProps {
  disabled: boolean;
  selectedDataType: string;
  setSelectedDataType: (dataType: string) => void;
}

export const SubformDataModelSelect = ({
  disabled,
  selectedDataType,
  setSelectedDataType,
}: ISubformDataModelSelectProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: dataModelIds = [] } = useAppMetadataModelIdsQuery(org, app, false);

  function handleChange(dataType: string) {
    setSelectedDataType(dataType);
  }

  return (
    <StudioNativeSelect
      label={t('ux_editor.component_properties.subform.data_model_binding_label')}
      disabled={disabled}
      onChange={(e) => handleChange(e.target.value)}
      value={selectedDataType}
      size='small'
    >
      <option value='' hidden></option>
      {dataModelIds.length === 0 ? (
        <option disabled>
          {t('ux_editor.component_properties.subform.data_model_empty_messsage')}
        </option>
      ) : (
        dataModelIds.map((dataModelId) => (
          <option value={dataModelId} key={dataModelId}>
            {dataModelId}
          </option>
        ))
      )}
    </StudioNativeSelect>
  );
};
