import React from 'react';
import {
  getDataModelFields,
  validateSelectedDataField,
  type InternalBindingFormat,
} from '@altinn/ux-editor/utils/dataModelUtils';
import { useTranslation } from 'react-i18next';
import { FormField } from 'app-shared/components/FormField';
import { StudioNativeSelect } from '@studio/components';
import { useValidDataModels } from '@altinn/ux-editor/hooks/useValidDataModels';
import type { ComponentType } from 'app-shared/types/ComponentType';
import classes from './SelectDataFieldBinding.module.css';

type SelectDataFieldProps = {
  internalBindingFormat: InternalBindingFormat;
  handleBindingChange: (dataModelBindings: InternalBindingFormat) => void;
  bindingKey: string;
  helpText: string;
  componentType: ComponentType;
};

export const SelectDataFieldBinding = ({
  internalBindingFormat,
  handleBindingChange,
  bindingKey,
  helpText,
  componentType,
}: SelectDataFieldProps): React.JSX.Element => {
  const { t } = useTranslation();
  const propertyPath = `definitions/component/properties/dataModelBindings/properties/${bindingKey}`;

  const { dataType: currentDataModel, field: currentDataModelField } = internalBindingFormat;
  const { dataModelMetadata, isDataModelValid, selectedDataModel } =
    useValidDataModels(currentDataModel);

  const dataModelFields = getDataModelFields({ componentType, bindingKey, dataModelMetadata });
  const isDataModelFieldValid = validateSelectedDataField(currentDataModelField, dataModelFields);

  // Validate datamodel as well: fallbacks to default if invalid, then user must update datafield
  const isBindingError = !isDataModelFieldValid || !isDataModelValid;

  const handleDataModelFieldChange = (updatedDataModelField: string) => {
    const updatedDataModelBinding = {
      field: updatedDataModelField,
      dataType: selectedDataModel,
    };
    handleBindingChange(updatedDataModelBinding);
  };

  const dataModelFieldsWithDefaultOption = [
    { value: '', label: t('ux_editor.modal_properties_data_model_field_choose') },
    ...dataModelFields,
  ];
  return (
    <FormField
      id={`selectDataModelField-${bindingKey}`}
      onChange={handleDataModelFieldChange}
      value={isBindingError ? '' : currentDataModelField}
      propertyPath={propertyPath}
      helpText={helpText}
      label={t('ux_editor.modal_properties_data_model_field_binding')}
      renderField={({ fieldProps }) => (
        <StudioNativeSelect
          className={classes.selectedDatafieldBinding}
          {...fieldProps}
          onChange={(e) => fieldProps.onChange(e.target.value)}
          error={isBindingError && t('ux_editor.modal_properties_data_model_field_update')}
          size='small'
        >
          {dataModelFieldsWithDefaultOption.map((element) => (
            <option key={element.value} value={element.value}>
              {element.label}
            </option>
          ))}
        </StudioNativeSelect>
      )}
    />
  );
};
