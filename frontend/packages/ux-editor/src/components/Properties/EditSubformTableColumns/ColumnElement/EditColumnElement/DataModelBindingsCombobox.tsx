import React from 'react';
import { StudioCombobox } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { FormItem } from '../../../../../types/FormItem';
import { convertDataBindingToInternalFormat } from '../../../../../utils/dataModelUtils';

type DataModelBindingsComboboxProps = {
  onSelectComponent: (field: string) => void;
  component?: FormItem;
  selectedField: string;
};

export const DataModelBindingsCombobox = ({
  onSelectComponent,
  component,
  selectedField,
}: DataModelBindingsComboboxProps) => {
  const { t } = useTranslation();

  return (
    <StudioCombobox
      label={t(
        'ux_editor.properties_panel.subform_table_columns.column_multiple_data_model_bindings_label',
      )}
      description={t(
        'ux_editor.properties_panel.subform_table_columns.column_multiple_data_model_bindings_description',
      )}
      size='sm'
      value={[selectedField]}
      onValueChange={(values) => onSelectComponent(values[0])}
    >
      {Object.keys(component.dataModelBindings).map((key) => {
        const { field } = convertDataBindingToInternalFormat(component, key);
        return (
          field && (
            <StudioCombobox.Option key={field} value={field} description={field}>
              {key === 'simpleBinding'
                ? t(`ux_editor.component_title.${component?.type}`)
                : t(`ux_editor.modal_properties_data_model_label.${key}`)}
            </StudioCombobox.Option>
          )
        );
      })}
    </StudioCombobox>
  );
};
