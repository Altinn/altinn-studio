import React from 'react';
import classes from './SelectDataModelBinding.module.css';
import { FormField } from 'app-shared/components/FormField';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { StudioDisplayTile, StudioNativeSelect } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useDataModelBindings } from '@altinn/ux-editor/hooks/useDataModelBindings';
import type { InternalBindingFormat } from '@altinn/ux-editor/utils/dataModel';
import type { DataModelFieldElement } from 'app-shared/types/DataModelFieldElement';

type SelectDataModelProps = {
  internalBindingFormat: InternalBindingFormat;
  dataModelFieldsFilter: (dataModelField: DataModelFieldElement) => boolean;
  bindingKey: string;
  handleBindingChange: (dataModel: { property: string; dataType: string }) => void;
};

export const SelectDataModelBinding = ({
  internalBindingFormat,
  dataModelFieldsFilter,
  bindingKey,
  handleBindingChange,
}: SelectDataModelProps): React.JSX.Element => {
  const { t } = useTranslation();
  const propertyPath = `definitions/component/properties/dataModelBindings/properties/${bindingKey}/dataType`;
  const { dataModel, dataModels } = useDataModelBindings({
    bindingFormat: internalBindingFormat,
    dataModelFieldsFilter,
  });

  const handleDataModelChange = (newDataModel: string) => {
    const dataModelBinding = {
      property: '',
      dataType: newDataModel,
    };
    handleBindingChange(dataModelBinding);
  };

  return shouldDisplayFeature('dataModelBindingSelector') ? (
    <FormField
      id={dataModel}
      onChange={handleDataModelChange}
      value={dataModel}
      propertyPath={propertyPath}
      label={t('ux_editor.modal_properties_data_model')}
      renderField={({ fieldProps }) => (
        <StudioNativeSelect {...fieldProps} onChange={(e) => fieldProps.onChange(e.target.value)}>
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
      label={t('ux_editor.modal_properties_data_model')}
      value={dataModel}
      className={classes.displayTileContainer}
    />
  );
};
