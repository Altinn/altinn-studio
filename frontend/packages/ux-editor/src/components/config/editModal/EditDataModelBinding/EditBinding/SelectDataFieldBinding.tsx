import React from 'react';
import {
  getDataModelFields,
  validateSelectedDataField,
  type InternalBindingFormat,
} from '@altinn/ux-editor/utils/dataModel';
import { useTranslation } from 'react-i18next';
import { FormField } from 'app-shared/components/FormField';
import { StudioNativeSelect } from '@studio/components';
import { useValidDataModels } from '@altinn/ux-editor/hooks/useValidDataModels';
import type { ComponentType } from 'app-shared/types/ComponentType';

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

  const { dataType: currentDataModel, property: currentDataModelField } = internalBindingFormat;
  const { dataModelMetaData, isDataModelValid, selectedDataModel } =
    useValidDataModels(currentDataModel);

  const dataModelFields = getDataModelFields({ componentType, bindingKey, dataModelMetaData });
  const isDataModelFieldValid = validateSelectedDataField(currentDataModelField, dataModelFields);

  // also checks if datamodel is valid - datamodel will fallback to default datamodel if invalid
  // while datafield need to be updated by user
  const isBindingError = !isDataModelFieldValid || !isDataModelValid;

  const handleDataModelFieldChange = (updatedDataModelField: string) => {
    const updatedDataModelBinding = {
      property: updatedDataModelField,
      dataType: selectedDataModel,
    };
    handleBindingChange(updatedDataModelBinding);
  };

  const dataModelFieldsWithDefaultOption = [{ value: '', label: 'Velg ...' }, ...dataModelFields];
  return (
    <FormField
      id={`selectDataModelSelect-${bindingKey}`}
      onChange={handleDataModelFieldChange}
      value={isBindingError ? '' : currentDataModelField}
      propertyPath={propertyPath}
      helpText={helpText}
      label={t('ux_editor.modal_properties_data_model_binding')}
      renderField={({ fieldProps }) => (
        <StudioNativeSelect
          {...fieldProps}
          onChange={(e) => fieldProps.onChange(e.target.value)}
          error={isBindingError && 'Datafelt må oppdateres.'}
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
