import React from 'react';
import {
  type InternalBindingFormat,
  validateSelectedDataField,
} from '@altinn/ux-editor/utils/dataModel';
import { useTranslation } from 'react-i18next';
import { FormField } from 'app-shared/components/FormField';
import { StudioNativeSelect } from '@studio/components';
import { useDataModelBindings } from '@altinn/ux-editor/hooks/useDataModelBindings';
import type { DataModelFieldElement } from 'app-shared/types/DataModelFieldElement';

type SelectDataFieldProps = {
  dataModelFieldsFilter: (dataModelField: DataModelFieldElement) => boolean;
  internalBindingFormat: InternalBindingFormat;
  handleBindingChange: (binding: { property: string; dataType: string }) => void;
  bindingKey: string;
  helpText: string;
};

export const SelectDataFieldBinding = ({
  dataModelFieldsFilter,
  internalBindingFormat,
  handleBindingChange,
  bindingKey,
  helpText,
}: SelectDataFieldProps): React.JSX.Element => {
  const { t } = useTranslation();
  const propertyPath = `definitions/component/properties/dataModelBindings/properties/${bindingKey}`;
  const { dataModelFields, dataModel, dataModelField } = useDataModelBindings({
    bindingFormat: internalBindingFormat,
    dataModelFieldsFilter,
  });

  const dataModelFieldsWithDefaultOption = [{ value: '', label: 'Velg ...' }, ...dataModelFields];

  const handleDataModelFieldChange = (updatedDataModelField: string) => {
    const updatedDataModelBinding = {
      property: updatedDataModelField,
      dataType: dataModel,
    };
    handleBindingChange(updatedDataModelBinding);
  };

  return (
    <FormField
      id={`selectDataModelSelect-${bindingKey}`}
      onChange={handleDataModelFieldChange}
      value={dataModelField}
      propertyPath={propertyPath}
      helpText={helpText}
      label={t('ux_editor.modal_properties_data_model_binding')}
      renderField={({ fieldProps }) => (
        <StudioNativeSelect
          {...fieldProps}
          onChange={(e) => fieldProps.onChange(e.target.value)}
          error={
            !validateSelectedDataField(dataModelField, dataModelFields) && 'Datafelt må oppdateres.'
          }
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
