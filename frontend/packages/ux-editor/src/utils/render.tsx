import React from 'react';
import { Typography } from '@mui/material';
import { SelectDataModelComponent } from '../components/config/SelectDataModelComponent';
import type { IDataModelBindings } from '../types/global';

export const styles = {
  inputHelper: {
    fontSize: '1.6rem',
    lineHeight: 'auto',
    color: '#000000',
  },
  optional: {
    marginTop: '2.4rem',
    marginLeft: '0.4rem',
    color: '#6A6A6A',
    fontSize: '1.4rem',
  },
  description: {
    fontSize: '1.4rem',
  },
};

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

export interface IPropertyLabelProps {
  textKey: string;
  htmlFor?: string;
}

export const PropertyLabel = ({ textKey, htmlFor }: IPropertyLabelProps) => {
  return (
    <Typography
      style={styles.inputHelper}
      component='label'
      htmlFor={htmlFor}
    >
      {textKey}
    </Typography>
  );
};

export function noOptionsMessage(language: any): string {
  return language['general.no_options'];
}

export interface IRenderSelectDataModelBinding {
  dataModelBinding: IDataModelBindings;
  onDataModelChange: any;
  language: any;
  label?: string;
  returnValue?: any;
  key?: string;
  uniqueKey?: any;
}

export function renderSelectDataModelBinding({
  dataModelBinding,
  onDataModelChange,
  language,
  label,
  returnValue,
  key = 'simpleBinding',
  uniqueKey,
}: IRenderSelectDataModelBinding): JSX.Element {
  const onDMChange = (dataModelField: any) => onDataModelChange(dataModelField, returnValue);
  const noOptMessage = () => noOptionsMessage(language);
  return (
    <div key={uniqueKey || ''}>
      <PropertyLabel
        textKey={
          label
            ? `${language['ux_editor.modal_properties_data_model_helper']} ${language['general.for']} ${label}`
            : language['ux_editor.modal_properties_data_model_helper']
        }
      />
      <SelectDataModelComponent
        selectedElement={dataModelBinding[key]}
        onDataModelChange={onDMChange}
        language={language}
        noOptionsMessage={noOptMessage}
      />
    </div>
  );
}

export function renderSelectGroupDataModelBinding(
  dataModelBinding: IDataModelBindings,
  onDataModelChange: any,
  language: any,
  key = 'simpleBinding',
): JSX.Element {
  return (
    <div>
      <PropertyLabel textKey={language['ux_editor.modal_properties_data_model_helper']}/>

      <SelectDataModelComponent
        selectedElement={dataModelBinding[key]}
        onDataModelChange={(dataModelField) => onDataModelChange(dataModelField, key)}
        language={language}
        selectGroup={true}
        noOptionsMessage={() => noOptionsMessage(language)}
      />
    </div>
  );
}
