import React from 'react';
import { Checkbox } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { FormField } from '../../FormField';
import { getComponentPropertyLabel } from '../../../utils/language';

export interface EditBooleanValueProps extends IGenericEditComponent {
  propertyKey: string;
  helpText?: string;
}

export const EditBooleanValue = ({
  component,
  handleComponentChange,
  propertyKey,
  helpText,
}: EditBooleanValueProps) => {
  const t = useText();

  const handleChange = () => {
    handleComponentChange({
      ...component,
      [propertyKey]: !component[propertyKey],
    });
  };

  return (
    <FormField
      id={component.id}
      label={getComponentPropertyLabel(propertyKey, t)}
      value={component[propertyKey]}
      onChange={handleChange}
      propertyPath={component.propertyPath}
      componentType={component.type}
    >
      {({ value, onChange }) => (
        <Checkbox
          checked={value}
          onChange={(e) => onChange(e.target.checked, e)}
          checkboxId={`${propertyKey}-checkbox-${component.id}`}
          helpText={helpText}
        />
      )}
    </FormField>
  );
};
