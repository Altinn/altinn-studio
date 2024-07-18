import React from 'react';
import classes from './SelectDataModelBinding.module.css';
import { FormField } from 'app-shared/components/FormField';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { StudioDisplayTile, StudioNativeSelect } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useValidDataModels } from '@altinn/ux-editor/hooks/useValidDataModels';
import type { InternalBindingFormat } from '@altinn/ux-editor/utils/dataModelUtils';

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
  const propertyPath = `definitions/component/properties/dataModelBindings/properties/${bindingKey}/dataType`;
  const { dataModels, selectedDataModel } = useValidDataModels(currentDataModel);

  const handleDataModelChange = (newDataModel: string) => {
    const dataModelBinding = {
      field: '',
      dataType: newDataModel,
    };
    handleBindingChange(dataModelBinding);
  };

  return shouldDisplayFeature('multipleDataModelsPerTask') ? (
    <FormField
      id={selectedDataModel}
      onChange={handleDataModelChange}
      value={selectedDataModel}
      propertyPath={propertyPath}
      label={t('ux_editor.modal_properties_data_model_binding')}
      renderField={({ fieldProps }) => (
        <StudioNativeSelect
          className={classes.selectDataModel}
          {...fieldProps}
          label={t('ux_editor.modal_properties_data_model_binding')}
          id={selectedDataModel}
          onChange={(e) => fieldProps.onChange(e.target.value)}
          size='small'
        >
          {dataModels.map((element) => (
            <option key={element} value={element}>
              {element}
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
