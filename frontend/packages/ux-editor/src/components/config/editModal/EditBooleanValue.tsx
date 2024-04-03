import React from 'react';
import { Switch } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { FormField } from '../../FormField';
import { useComponentPropertyLabel } from '../../../hooks/useComponentPropertyLabel';

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
  const componentPropertyLabel = useComponentPropertyLabel();

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
      value={component[propertyKey] || false}
      onChange={handleChange}
      propertyPath={component.propertyPath}
      componentType={component.type}
      helpText={
        isValueExpression(component[propertyKey])
          ? t('ux_editor.component_properties.config_is_expression_message')
          : helpText
      }
      renderField={({ fieldProps }) => {
        return (
          <Switch
            {...fieldProps}
            checked={fieldProps.value}
            onChange={(e) => fieldProps.onChange(e.target.checked, e)}
            size='small'
            id={`${propertyKey}-checkbox-${component.id}`}
            disabled={isValueExpression(fieldProps.value)}
          >
            {componentPropertyLabel(propertyKey)}
          </Switch>
        );
      }}
    />
  );
};
