import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { useTranslation } from 'react-i18next';
import { FormField } from '../../FormField';
import { getComponentPropertyLabel } from '../../../utils/language';
import { setComponentProperty } from '../../../utils/component';
import { StudioDecimalInput } from 'libs/studio-components-legacy/src';

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
    handleComponentChange(setComponentProperty(component, propertyKey, newValue));
  };

  return (
    <FormField
      id={component.id}
      value={component[propertyKey]}
      onChange={handleValueChange}
      propertyPath={component.propertyPath}
      helpText={helpText}
      renderField={({ fieldProps }) => (
        <StudioDecimalInput
          {...fieldProps}
          onChange={fieldProps.onChange}
          description={getComponentPropertyLabel(propertyKey, t)}
          validationErrorMessage={t('validation_errors.numbers_only')}
        />
      )}
    />
  );
};
