import React from 'react';
import {
  getDataModelFields,
  validateSelectedDataField,
} from '@altinn/ux-editor/utils/dataModelUtils';
import { useTranslation } from 'react-i18next';
import { FormField } from 'app-shared/components/FormField';
import { StudioNativeSelect } from 'libs/studio-components-legacy/src';
import { useValidDataModels } from '@altinn/ux-editor/hooks/useValidDataModels';
import type { ComponentType } from 'app-shared/types/ComponentType';
import classes from './SelectDataFieldBinding.module.css';
import { useComponentPropertyHelpText } from '../../../../../hooks';
import type { ExplicitDataModelBinding } from '@altinn/ux-editor/types/global';

type SelectDataFieldProps = {
  internalBindingFormat: ExplicitDataModelBinding;
  handleBindingChange: (dataModelBindings: ExplicitDataModelBinding) => void;
  bindingKey: string;
  componentType: ComponentType;
};

export const SelectDataFieldBinding = ({
  internalBindingFormat,
  handleBindingChange,
  bindingKey,
  componentType,
}: SelectDataFieldProps): React.JSX.Element => {
  const { t } = useTranslation();
  const propertyPath = `definitions/component/properties/dataModelBindings/properties/${bindingKey}`;

  const { dataType: currentDataModel, field: currentDataModelField } = internalBindingFormat || {
    dataType: '',
    field: '',
  };
  const { dataModelMetadata, isDataModelValid, selectedDataModel } =
    useValidDataModels(currentDataModel);

  const dataModelFields = getDataModelFields({ componentType, bindingKey, dataModelMetadata });
  const isDataModelFieldValid = validateSelectedDataField(currentDataModelField, dataModelFields);
  const componentPropertyHelpText = useComponentPropertyHelpText();

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
      helpText={componentPropertyHelpText(`data_model_bindings.${bindingKey}`)}
      label={t('ux_editor.modal_properties_data_model_field_binding')}
      renderField={({ fieldProps }) => (
        <StudioNativeSelect
          className={classes.selectedDatafieldBinding}
          {...fieldProps}
          id={`selectDataModelField-${bindingKey}`}
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
