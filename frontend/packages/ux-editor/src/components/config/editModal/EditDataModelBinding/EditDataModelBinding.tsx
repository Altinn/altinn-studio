import type { IGenericEditComponent } from '../../componentConfig';
import type { ComponentType } from 'app-shared/types/ComponentType';
import React, { useState } from 'react';
import classes from './EditDataModelBinding.module.css';
import { useTranslation } from 'react-i18next';
import { UndefinedBinding } from './UndefinedBinding';
import { EditBinding } from './EditBinding';
import { DefinedBinding } from './DefinedBinding';

export interface EditDataModelBindingProps<T extends ComponentType>
  extends IGenericEditComponent<T> {
  renderOptions?: {
    label?: string;
    returnValue?: any;
    key?: string;
  };
}

export const EditDataModelBinding = <T extends ComponentType>({
  component,
  handleComponentChange,
  renderOptions,
}: EditDataModelBindingProps<T>) => {
  const { key, label } = renderOptions || {};
  const { t } = useTranslation();
  const [dataModelSelectVisible, setDataModelSelectVisible] = useState(false);
  const bindingKey = key || 'simpleBinding';
  const dataModelBinding = component?.dataModelBindings?.[bindingKey];

  const labelSpecificText = label
    ? t(`ux_editor.modal_properties_data_model_label.${label}`)
    : t(`ux_editor.component_title.${component.type}`);

  return (
    <div key={key || ''} className={classes.wrapper}>
      {!dataModelBinding?.field && !dataModelSelectVisible ? (
        <UndefinedBinding
          onClick={() => setDataModelSelectVisible(true)}
          label={labelSpecificText}
        />
      ) : dataModelSelectVisible ? (
        <EditBinding
          bindingKey={bindingKey}
          component={component}
          label={labelSpecificText}
          handleComponentChange={handleComponentChange}
          onSetDataModelSelectVisible={setDataModelSelectVisible}
          internalBindingFormat={dataModelBinding}
        />
      ) : (
        <DefinedBinding
          label={labelSpecificText}
          onClick={() => setDataModelSelectVisible(true)}
          internalBindingFormat={dataModelBinding}
          componentType={component.type}
          bindingKey={bindingKey}
        />
      )}
    </div>
  );
};
