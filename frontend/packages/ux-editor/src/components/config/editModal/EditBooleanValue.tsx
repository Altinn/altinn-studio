import React from 'react';
import { LegacyCheckbox } from '@digdir/design-system-react';
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

  const isValueExpression = (value: any) => {
    return Array.isArray(value);
  };

  return (
    <FormField
      id={component.id}
      label={getComponentPropertyLabel(propertyKey, t)}
      value={component[propertyKey]}
      onChange={handleChange}
      propertyPath={component.propertyPath}
      componentType={component.type}
      helpText={
        isValueExpression(component[propertyKey])
          ? t('ux_editor.component_properties.config_is_expression_message')
          : helpText
      }
    >
      {({ value, onChange }) => {
        return (
          <LegacyCheckbox
            checked={value}
            onChange={(e) => onChange(e.target.checked, e)}
            checkboxId={`${propertyKey}-checkbox-${component.id}`}
            disabled={isValueExpression(value)}
          />
        );
      }}
    </FormField>
  );
};
