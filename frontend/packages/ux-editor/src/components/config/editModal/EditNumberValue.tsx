import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { useTranslation } from 'react-i18next';
import { FormField } from '../../FormField';
import { TextField } from '@digdir/design-system-react';
import { getComponentPropertyLabel } from '../../../utils/language';
import { setComponentProperty } from '../../../utils/component';

export interface EditNumberValueProps extends IGenericEditComponent {
  propertyKey: string;
  helpText?: string;
}

export const EditNumberValue = ({
  component,
  handleComponentChange,
  propertyKey,
  helpText,
}: EditNumberValueProps) => {
  const { t } = useTranslation();

  const handleValueChange = (newValue: number) => {
    if (newValue === undefined || newValue === null) return;
    handleComponentChange(setComponentProperty(component, propertyKey, newValue));
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
        if (errorCode === 'type') {
          return t('validation_errors.numbers_only');
        }
      }}
    >
      {({ onChange }) => (
        <TextField
          name={`component-${propertyKey}-input-${component.id}`}
          onChange={(e) => onChange(e.target.value as unknown as number, e)}
          inputMode='numeric'
          formatting={{ number: {} }}
        />
      )}
    </FormField>
  );
};
