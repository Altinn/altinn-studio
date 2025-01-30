import React from 'react';
import { StudioCombobox } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { FormItem } from '../../../../../types/FormItem';
import { convertDataBindingToInternalFormat } from '../../../../../utils/dataModelUtils';

type DataModelBindingsComboboxProps = {
  onSelectComponent: (values: string[]) => void;
  component?: FormItem;
};

export const DataModelBindingsCombobox = ({
  onSelectComponent,
  component,
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
      onValueChange={onSelectComponent}
    >
      {Object.keys(component?.dataModelBindings ?? {}).map((key) => {
        const value = convertDataBindingToInternalFormat(component, key);
        return (
          <StudioCombobox.Option key={key} value={key} description={value?.field}>
            {key === 'simpleBinding'
              ? t(`ux_editor.component_title.${component?.type}`)
              : t(`ux_editor.modal_properties_data_model_label.${key}`)}
          </StudioCombobox.Option>
        );
      })}
    </StudioCombobox>
  );
};
