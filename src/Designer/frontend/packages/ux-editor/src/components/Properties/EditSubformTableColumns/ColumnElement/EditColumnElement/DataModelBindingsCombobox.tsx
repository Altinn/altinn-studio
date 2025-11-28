import React, { useState } from 'react';
import { StudioSuggestion } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { IDataModelBindingsKeyValueExplicit } from '../../../../../types/global';

type DataModelBindingsComboboxProps = {
  componentType: string;
  dataModelBindings: IDataModelBindingsKeyValueExplicit;
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

  const selectedItems = dataModelBindingKey
    ? [{ value: dataModelBindingKey, label: dataModelBindingKey }]
    : [];

  const getOptionLabel = (key: string) => {
    return key === 'simpleBinding'
      ? t(`ux_editor.component_title.${componentType}`)
      : t(`ux_editor.modal_properties_data_model_label.${key}`);
  };

  const handleSelectedChange = (items: { value: string }[]) => {
    onValueChange(items[0]?.value || '');
  };

  return (
    <StudioSuggestion
      label={t(
        'ux_editor.properties_panel.subform_table_columns.column_multiple_data_model_bindings_label',
      )}
      description={t(
        'ux_editor.properties_panel.subform_table_columns.column_multiple_data_model_bindings_description',
      )}
      emptyText={''}
      filter={() => true}
      selected={selectedItems}
      onSelectedChange={handleSelectedChange}
    >
      {Object.keys(dataModelBindings).map((key) => {
        const binding = dataModelBindings?.[key];
        return (
          binding && (
            <StudioSuggestion.Option key={key} value={key}>
              <div>
                <div>{getOptionLabel(key)}</div>
                <div>{binding.field}</div>
              </div>
            </StudioSuggestion.Option>
          )
        );
      })}
    </StudioSuggestion>
  );
};
