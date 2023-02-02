import React from 'react';
import { SelectDataModelComponent } from '../components/config/SelectDataModelComponent';
import type { IDataModelBindings } from '../types/global';
import { Label } from '@altinn/schema-editor/components/common/Label';
import { useText } from '../hooks';

export const selectStyles = {
  control: (base: any) => ({
    ...base,
    borderRadius: '0 !important',
  }),
  option: (provided: any) => ({
    ...provided,
    whiteSpace: 'pre-wrap',
  }),
};

interface SelectDataModelBindingProps {
  dataModelBinding: IDataModelBindings;
  onDataModelChange: (dataBindingName: string, key: string) => void;
  key: string;
}

export const SelectGroupDataModelBinding = ({
  dataModelBinding,
  onDataModelChange,
  key = 'simpleBinding',
}: SelectDataModelBindingProps): JSX.Element => {
  const t = useText();
  return (
    <div>
      <Label htmlFor='dataModalHelper'>
        {t('ux_editor.modal_properties_data_model_helper')}
      </Label>
      <SelectDataModelComponent
        inputId='dataModalHelper'
        selectedElement={dataModelBinding[key]}
        onDataModelChange={(dataModelField) => onDataModelChange(dataModelField, key)}
        selectGroup={true}
        noOptionsMessage={t('general.no_options')}
      />
    </div>
  );
};
