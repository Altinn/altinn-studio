import React from 'react';
import { SelectDataFieldComponent } from '../../../SelectDataFieldComponent';
import { getDataModelFieldsFilter } from '@altinn/ux-editor/utils/dataModel';
import { useTranslation } from 'react-i18next';
import type { FormItem } from '../../../../../types/FormItem';

type SelectDataFieldProps = {
  selectedDataModel: string;
  component: FormItem;
  handleBindingChange: (binding: { property: string; dataType: string }) => void;
  bindingKey: string;
  helpText: string;
  selectedDataField: string;
};

export const SelectDataFieldBinding = ({
  selectedDataModel,
  component,
  handleBindingChange,
  bindingKey,
  helpText,
  selectedDataField,
}: SelectDataFieldProps): React.JSX.Element => {
  const { t } = useTranslation();
  const propertyPath = `definitions/component/properties/dataModelBindings/properties/${bindingKey}`;

  const handleDataFieldChange = (selectedDataFieldElement: string) => {
    const dataModelBinding = {
      property: selectedDataFieldElement,
      dataType: selectedDataModel,
    };
    handleBindingChange(dataModelBinding);
  };

  return (
    <SelectDataFieldComponent
      dataModelFieldsFilter={getDataModelFieldsFilter(component.type, bindingKey === 'list')}
      helpText={helpText}
      inputId={`selectDataModelSelect-${bindingKey}`}
      label={t('ux_editor.modal_properties_data_model_binding')}
      onDataModelChange={handleDataFieldChange}
      propertyPath={propertyPath}
      selectedElement={selectedDataField}
      dataModelName={selectedDataModel}
    />
  );
};
