import React from 'react';
import classes from './SelectDataModelBinding.module.css';
import { FormField } from 'app-shared/components/FormField';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { StudioDisplayTile, StudioNativeSelect } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { InternalBindingFormat } from '@altinn/ux-editor/utils/dataModelUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../../../../hooks';
import { useGetBindableDataTypes } from '../../../../../hooks/useGetBindableDataTypes';
import { useValidDataModels } from '../../../../../hooks/useValidDataModels';

type SelectDataModelProps = {
  currentDataModel: string;
  bindingKey: string;
  handleBindingChange: (dataModelBindings: InternalBindingFormat) => void;
};

export const SelectDataModelBinding = ({
  currentDataModel,
  bindingKey,
  handleBindingChange,
}: SelectDataModelProps): React.JSX.Element => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { selectedDataModel } = useValidDataModels(currentDataModel);
  const { defaultDataTypeName, bindableDataTypes } = useGetBindableDataTypes(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const propertyPath = `definitions/component/properties/dataModelBindings/properties/${bindingKey}/dataType`;

  const handleDataModelChange = (newDataModel: string) => {
    const dataModelBinding = {
      field: '',
      dataType: newDataModel,
    };
    handleBindingChange(dataModelBinding);
  };

  return shouldDisplayFeature('multipleDataModelsPerTask') ? (
    <FormField
      id={currentDataModel}
      onChange={handleDataModelChange}
      value={currentDataModel}
      propertyPath={propertyPath}
      label={t('ux_editor.modal_properties_data_model_binding')}
      renderField={({ fieldProps }) => (
        <StudioNativeSelect
          className={classes.selectDataModel}
          {...fieldProps}
          label={t('ux_editor.modal_properties_data_model_binding')}
          id={currentDataModel}
          onChange={(e) => fieldProps.onChange(e.target.value)}
          size='small'
        >
          <option key={defaultDataTypeName} value={defaultDataTypeName}>
            {defaultDataTypeName}
          </option>
          {bindableDataTypes.map((dataType) => (
            <option key={dataType.id} value={dataType.id}>
              {dataType.id}
            </option>
          ))}
        </StudioNativeSelect>
      )}
    />
  ) : (
    <StudioDisplayTile
      label={t('ux_editor.modal_properties_data_model_binding')}
      value={selectedDataModel}
      className={classes.displayTileContainer}
    />
  );
};
