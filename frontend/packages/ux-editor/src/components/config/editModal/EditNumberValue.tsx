import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { useTranslation } from 'react-i18next';
import { FormField } from '../../FormField';
import { getComponentPropertyLabel } from '../../../utils/language';
import { setComponentProperty } from '../../../utils/component';
import { StudioDecimalInput } from '../../../../../../libs/studio-components/src/components/StudioNumberInput/StudioDecimalInput';

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
      value={component[propertyKey]}
      onChange={handleValueChange}
      propertyPath={component.propertyPath}
      helpText={helpText}
    >
      {({ onChange }) => (
        <StudioDecimalInput
          onChange={onChange}
          description={getComponentPropertyLabel(propertyKey, t)}
        />
      )}
    </FormField>
  );
};
