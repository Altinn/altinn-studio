import type { IGenericEditComponent } from '../../componentConfig';
import type { ComponentType } from 'app-shared/types/ComponentType';
import React, { useState } from 'react';
import classes from './EditDataModelBinding.module.css';
import { useTranslation } from 'react-i18next';
import { UndefinedBinding } from './UndefinedBinding';
import { EditBinding } from './EditBinding';
import { DefinedBinding } from './DefinedBinding';
import { convertDataBindingToInternalFormat } from '../../../../utils/dataModel';
import { useDataModelBindings } from '@altinn/ux-editor/hooks/useDataModelBindings';
import { getDataModelFieldsFilter } from '@altinn/ux-editor/utils/dataModel';

export interface EditDataModelBindingProps<T extends ComponentType>
  extends IGenericEditComponent<T> {
  renderOptions?: {
    label?: string;
    returnValue?: any;
    key?: string;
    uniqueKey?: any;
  };
  helpText?: string;
  setIsBindingAlert?: (value: boolean) => void;
}

export const EditDataModelBinding = <T extends ComponentType>({
  component,
  handleComponentChange,
  renderOptions,
  helpText,
  setIsBindingAlert,
}: EditDataModelBindingProps<T>) => {
  const { uniqueKey, key, label } = renderOptions || {};
  const bindingKey = key || 'simpleBinding';
  const { t } = useTranslation();
  const [dataModelSelectVisible, setDataModelSelectVisible] = useState(false);

  const internalBindingFormat = convertDataBindingToInternalFormat(component, bindingKey);
  const selectedDataModelField = internalBindingFormat.property;

  const { isBindingError, isLoading } = useDataModelBindings({
    bindingFormat: internalBindingFormat,
    dataModelFieldsFilter: getDataModelFieldsFilter(component.type, bindingKey === 'list'),
  });

  if (isLoading) {
    return;
  }

  if (isBindingError) {
    setIsBindingAlert(true);
  }

  const labelSpecificText = label
    ? t(`ux_editor.modal_properties_data_model_label.${label}`)
    : t(`ux_editor.component_title.${component.type}`);

  return (
    <div key={uniqueKey || ''} className={classes.wrapper}>
      {!selectedDataModelField && !dataModelSelectVisible ? (
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
          dataModelFieldsFilter={getDataModelFieldsFilter(component.type, bindingKey === 'list')}
        />
      ) : (
        <DefinedBinding
          label={labelSpecificText}
          onClick={() => setDataModelSelectVisible(true)}
          selectedOption={selectedDataModelField}
        />
      )}
    </div>
  );
};
