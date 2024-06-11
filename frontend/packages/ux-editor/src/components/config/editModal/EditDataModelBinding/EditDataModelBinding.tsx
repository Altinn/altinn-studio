import type { IGenericEditComponent } from '../../componentConfig';
import type { ComponentType } from 'app-shared/types/ComponentType';
import React, { useState } from 'react';
import classes from './EditDataModelBinding.module.css';
import { useTranslation } from 'react-i18next';
import { UndefinedBinding } from './UndefinedBinding';
import { EditBinding } from './EditBinding';
import { DefinedBinding } from './DefinedBinding';
import { convertDataBindingToInternalFormat } from './editDataModelBindingUtils';

export interface EditDataModelBindingProps<T extends ComponentType>
  extends IGenericEditComponent<T> {
  renderOptions?: {
    label?: string;
    returnValue?: any;
    key?: string;
    uniqueKey?: any;
  };
  helpText?: string;
}

export const EditDataModelBinding = <T extends ComponentType>({
  component,
  handleComponentChange,
  renderOptions,
  helpText,
}: EditDataModelBindingProps<T>) => {
  const { uniqueKey, key, label } = renderOptions || {};
  const bindingKey = key || 'simpleBinding';
  const { t } = useTranslation();
  const [dataModelSelectVisible, setDataModelSelectVisible] = useState(false);

  const labelSpecificText = label
    ? t(`ux_editor.modal_properties_data_model_label.${label}`)
    : t(`ux_editor.component_title.${component.type}`);

  const newDataModelBindingFormat = convertDataBindingToInternalFormat(component, bindingKey);
  const selectedDataField = newDataModelBindingFormat.property;

  return (
    <div key={uniqueKey || ''} className={classes.wrapper}>
      {!selectedDataField && !dataModelSelectVisible ? (
        <UndefinedBinding
          onClick={() => setDataModelSelectVisible(true)}
          label={labelSpecificText}
        />
      ) : dataModelSelectVisible ? (
        <EditBinding
          bindingKey={bindingKey}
          selectedDataModel={newDataModelBindingFormat.dataType}
          component={component}
          helpText={helpText}
          label={labelSpecificText}
          handleComponentChange={handleComponentChange}
          selectedDataField={selectedDataField}
          setDataModelSelectVisible={setDataModelSelectVisible}
        />
      ) : (
        <DefinedBinding
          label={labelSpecificText}
          onClick={() => setDataModelSelectVisible(true)}
          selectedOption={selectedDataField}
        />
      )}
    </div>
  );
};
