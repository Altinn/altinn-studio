import React from 'react';
import type { IDataModelBindings } from '../../../types/global';
import { Label } from 'app-shared/components/Label';
import { SelectDataModelComponent } from '../SelectDataModelComponent';
import { useTranslation } from 'react-i18next';

export interface EditGroupDataModelBindingProps {
  dataModelBindings: IDataModelBindings;
  onDataModelChange: (dataBindingName: string, key: string) => void;
}

export const EditGroupDataModelBindings = ({
  dataModelBindings,
  onDataModelChange,
}: EditGroupDataModelBindingProps) => {
  const { t } = useTranslation();
  return (
    <div>
      <Label htmlFor='dataModalHelper'>{t('ux_editor.modal_properties_data_model_helper')}</Label>
      <SelectDataModelComponent
        inputId='dataModalHelper'
        selectedElement={dataModelBindings?.group}
        onDataModelChange={(dataModelField) => onDataModelChange(dataModelField, 'group')}
        selectGroup={true}
        noOptionsMessage={t('general.no_options')}
      />
    </div>
  );
};
