import React from 'react';
import { Typography } from '@mui/material';
import { SelectDataModelComponent } from '../components/config/SelectDataModelComponent';
import type { IDataModelBindings } from '../types/global';
import { useText } from '../hooks';
import type { UseText } from '../hooks';


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

const getNoOptionsMessage = (t: UseText): string => t('general.no_options');

export interface IRenderSelectDataModelBinding {
  dataModelBinding: IDataModelBindings;
  onDataModelChange: any;
  language: any;
  label?: string;
  returnValue?: any;
  key?: string;
  uniqueKey?: any;
}

export const renderSelectDataModelBinding = ({
  dataModelBinding,
  onDataModelChange,
  language,
  label,
  returnValue,
  key = 'simpleBinding',
  uniqueKey,
}: IRenderSelectDataModelBinding): JSX.Element => {
  const t = useText();
  const onDMChange = (dataModelField: any) => onDataModelChange(dataModelField, returnValue);
  return (
    <div key={uniqueKey || ''}>
      <PropertyLabel
        textKey={
          label
            ? `${t('ux_editor.modal_properties_data_model_helper')} ${t('general.for')} ${label}`
            : t('ux_editor.modal_properties_data_model_helper')
        }
      />
      <SelectDataModelComponent
        selectedElement={dataModelBinding[key]}
        onDataModelChange={onDMChange}
        language={language}
        noOptionsMessage={(): string => getNoOptionsMessage(t)}
      />
    </div>
  );
};

export const renderSelectGroupDataModelBinding = (
  dataModelBinding: IDataModelBindings,
  onDataModelChange: any,
  language: any,
  key = 'simpleBinding'
): JSX.Element => {
  const t = useText();
  return (
    <div>
      <PropertyLabel textKey={language['ux_editor.modal_properties_data_model_helper']} />

      <SelectDataModelComponent
        selectedElement={dataModelBinding[key]}
        onDataModelChange={(dataModelField) => onDataModelChange(dataModelField, key)}
        language={language}
        selectGroup={true}
        noOptionsMessage={(): string => getNoOptionsMessage(t)}
      />
    </div>
  );
};
