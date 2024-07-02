import type { IGenericEditComponent } from '../../componentConfig';
import type { ComponentType } from 'app-shared/types/ComponentType';
import React, { useState } from 'react';
import classes from './EditDataModelBinding.module.css';
import { useTranslation } from 'react-i18next';
import { UndefinedBinding } from './UndefinedBinding';
import { EditBinding } from './EditBinding';
import { DefinedBinding } from './DefinedBinding';
import { convertDataBindingToInternalFormat } from '../../../../utils/dataModelUtils';

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

  const internalBindingFormat = convertDataBindingToInternalFormat(component, bindingKey);

  const labelSpecificText = label
    ? t(`ux_editor.modal_properties_data_model_label.${label}`)
    : t(`ux_editor.component_title.${component.type}`);

  return (
    <div key={uniqueKey || ''} className={classes.wrapper}>
      {!internalBindingFormat.field && !dataModelSelectVisible ? (
        <UndefinedBinding
          onClick={() => setDataModelSelectVisible(true)}
          label={labelSpecificText}
        />
      ) : dataModelSelectVisible ? (
        <EditBinding
          bindingKey={bindingKey}
          component={component}
          helpText={helpText}
          label={labelSpecificText}
          handleComponentChange={handleComponentChange}
          setDataModelSelectVisible={setDataModelSelectVisible}
          internalBindingFormat={internalBindingFormat}
        />
      ) : (
        <DefinedBinding
          label={labelSpecificText}
          onClick={() => setDataModelSelectVisible(true)}
          internalBindingFormat={internalBindingFormat}
          componentType={component.type}
          bindingKey={bindingKey}
        />
      )}
    </div>
  );
};
