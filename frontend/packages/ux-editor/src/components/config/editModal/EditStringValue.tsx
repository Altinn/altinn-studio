import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { useTranslation } from 'react-i18next';
import { FormField } from '../../FormField';
import { Select, TextField } from '@digdir/design-system-react';
import { getComponentPropertyLabel } from '../../../utils/language';

export interface EditStringValueProps extends IGenericEditComponent {
  propertyKey: string;
  helpText?: string;
  enumValues?: string[];
  multiple?: boolean;
}

export const EditStringValue = ({
  component,
  handleComponentChange,
  propertyKey,
  helpText,
  enumValues,
  multiple,
}: EditStringValueProps) => {
  const { t } = useTranslation();

  const handleValueChange = (newValue: string) => {
    handleComponentChange({
      ...component,
      [propertyKey]: newValue,
    });
  };

  return (
    <FormField
      id={component.id}
      label={getComponentPropertyLabel(propertyKey, t)}
      value={component[propertyKey]}
      onChange={handleValueChange}
      propertyPath={component.propertyPath}
      helpText={helpText}
      customValidationMessages={(errorCode: string) => {
        if (errorCode === 'pattern') {
          return t('validation_errors.pattern');
        }
      }}
    >
      {enumValues
        ? ({ onChange }) => (
            <Select
              options={enumValues.map((value) => ({
                label: value,
                value: value,
              }))}
              onChange={(e: any) => onChange(e)}
              multiple={multiple}
              inputId={`component-${propertyKey}-select${component.id}`}
            />
          )
        : ({ onChange }) => (
            <TextField
              name={`component-id-input${component.id}`}
              onChange={(e) => onChange(e.target.value, e)}
            />
          )}
    </FormField>
  );
};
