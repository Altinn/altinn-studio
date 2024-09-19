import React from 'react';
import { Switch } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { FormField } from '../../FormField';
import { useComponentPropertyLabel } from '../../../hooks/useComponentPropertyLabel';

export interface EditBooleanValueProps extends IGenericEditComponent {
  propertyKey: string;
  helpText?: string;
  defaultValue?: boolean;
}

export const EditBooleanValue = ({
  component,
  handleComponentChange,
  propertyKey,
  helpText,
  defaultValue,
}: EditBooleanValueProps) => {
  const t = useText();
  const componentPropertyLabel = useComponentPropertyLabel();

  const handleChange = () => {
    debugger;
    handleComponentChange({
      ...component,
      [propertyKey]: getNewBooleanValue(),
    });
  };

  const isValueExpression = (value: any) => {
    return Array.isArray(value);
  };

  const getNewBooleanValue = () => {
    return component[propertyKey] === undefined ? !defaultValue : !component[propertyKey];
  };

  return (
    <FormField
      id={component.id}
      value={component[propertyKey]}
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
            checked={fieldProps.value ?? defaultValue}
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
