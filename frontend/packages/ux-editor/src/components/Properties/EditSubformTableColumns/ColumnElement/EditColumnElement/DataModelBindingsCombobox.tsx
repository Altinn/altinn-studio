import React, { useState } from 'react';
import { StudioCombobox } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import type { IDataModelBindingsKeyValue } from '../../../../../types/global';
import { convertDataBindingToInternalFormat } from '../../../../../utils/dataModelUtils';

type DataModelBindingsComboboxProps = {
  componentType: string;
  dataModelBindings?: IDataModelBindingsKeyValue;
  onDataModelBindingChange: (dataModelBindingKey: string) => void;
  initialDataModelBindingKey: string;
};

export const DataModelBindingsCombobox = ({
  componentType,
  dataModelBindings,
  onDataModelBindingChange,
  initialDataModelBindingKey,
}: DataModelBindingsComboboxProps) => {
  const { t } = useTranslation();
  const [dataModelBindingKey, setDataModelBindingKey] = useState<string>(
    initialDataModelBindingKey,
  );

  const onValueChange = (value: string) => {
    setDataModelBindingKey(value);
    onDataModelBindingChange(value);
  };

  return (
    <StudioCombobox
      label={t(
        'ux_editor.properties_panel.subform_table_columns.column_multiple_data_model_bindings_label',
      )}
      description={t(
        'ux_editor.properties_panel.subform_table_columns.column_multiple_data_model_bindings_description',
      )}
      size='sm'
      value={[dataModelBindingKey]}
      onValueChange={(values) => onValueChange(values[0])}
    >
      {Object.keys(dataModelBindings).map((key) => {
        const { field } = convertDataBindingToInternalFormat(dataModelBindings?.[key]);
        return (
          field && (
            <StudioCombobox.Option key={key} value={key} description={field}>
              {key === 'simpleBinding'
                ? t(`ux_editor.component_title.${componentType}`)
                : t(`ux_editor.modal_properties_data_model_label.${key}`)}
            </StudioCombobox.Option>
          )
        );
      })}
    </StudioCombobox>
  );
};
