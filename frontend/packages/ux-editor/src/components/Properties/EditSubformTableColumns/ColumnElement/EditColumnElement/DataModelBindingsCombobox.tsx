import React, { useState } from 'react';
import { StudioCombobox } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { IDataModelBindings } from '../../../../../types/global';
import { convertDataBindingToInternalFormat } from '../../../../../utils/dataModelUtils';

type DataModelBindingsComboboxProps = {
  componentType: string;
  dataModelBindings?: IDataModelBindings;
  onDataModelBindingChange: (dataModelBindingKey: string) => void;
};

export const DataModelBindingsCombobox = ({
  componentType,
  dataModelBindings,
  onDataModelBindingChange,
}: DataModelBindingsComboboxProps) => {
  const { t } = useTranslation();
  const bindings = Object.keys(dataModelBindings).map((key) => {
    const dataModelBinding = convertDataBindingToInternalFormat(dataModelBindings?.[key]);
    return {
      key,
      dataModelBinding,
    };
  });
  const [dataModelBindingKey, setDataModelBindingKey] = useState<string>(bindings[0].key);

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
      {bindings.map(({ key, dataModelBinding }) => {
        return (
          <StudioCombobox.Option key={key} value={key} description={dataModelBinding.field}>
            {key === 'simpleBinding'
              ? t(`ux_editor.component_title.${componentType}`)
              : t(`ux_editor.modal_properties_data_model_label.${key}`)}
          </StudioCombobox.Option>
        );
      })}
    </StudioCombobox>
  );
};
