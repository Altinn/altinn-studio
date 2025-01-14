import React from 'react';
import { StudioCombobox } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { convertDataBindingToInternalFormat } from '../../../../../utils/dataModelUtils';
import type { FormItem } from '../../../../../types/FormItem';

type DataModelBindingsComboboxProps = {
  filteredDatamodelBindings?: any[];
  onSelectComponent?: (values: string[]) => void;
  component?: FormItem;
};

export const DataModelBindingsCombobox = ({
  filteredDatamodelBindings,
  onSelectComponent,
  component,
}: DataModelBindingsComboboxProps) => {
  const { t } = useTranslation();

  const options = filteredDatamodelBindings.map((binding, index) => {
    const [key] = Object.entries(binding)[0];
    const value = convertDataBindingToInternalFormat(component, key);
    const keyLabel =
      key === 'simpleBinding'
        ? t(`ux_editor.component_title.${component?.type}`)
        : t(`ux_editor.modal_properties_data_model_label.${key}`);

    return { key, keyLabel, value, index };
  });

  return (
    <StudioCombobox
      label={t(
        'ux_editor.properties_panel.subform_table_columns.column_multiple_data_model_bindings_label',
      )}
      description={t(
        'ux_editor.properties_panel.subform_table_columns.column_multiple_data_model_bindings_description',
      )}
      size='sm'
      onValueChange={onSelectComponent}
    >
      {options.map(({ key, keyLabel, value, index }) => (
        <StudioCombobox.Option key={index} value={key} description={value?.field}>
          {keyLabel}
        </StudioCombobox.Option>
      ))}
    </StudioCombobox>
  );
};
