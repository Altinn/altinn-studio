import React from 'react';
import { Switch } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText, useComponentPropertyLabel, useComponentPropertyHelpText } from '../../../hooks';
import { FormField } from '../../FormField';

export interface EditBooleanValueProps extends IGenericEditComponent {
  propertyKey: string;
  defaultValue?: boolean;
  helpText?: string;
}

export const EditBooleanValue = ({
  component,
  handleComponentChange,
  propertyKey,
  defaultValue,
  helpText,
}: EditBooleanValueProps) => {
  const t = useText();
  const componentPropertyLabel = useComponentPropertyLabel();
  const componentPropertyHelpText = useComponentPropertyHelpText();

  const handleChange = () => {
    handleComponentChange({
      ...component,
      [propertyKey]: getNewBooleanValue(),
    });
  };

  const isValueExpression = (value: any) => {
    return Array.isArray(value);
  };

  const getNewBooleanValue = () => !(component[propertyKey] ?? defaultValue);

  const getHelpText = () => {
    if (isValueExpression(component[propertyKey])) {
      return t('ux_editor.component_properties.config_is_expression_message');
    }
    return componentPropertyHelpText(propertyKey) || helpText;
  };

  return (
    <FormField
      id={component.id}
      value={component[propertyKey]}
      onChange={handleChange}
      propertyPath={component.propertyPath}
      componentType={component.type}
      helpText={getHelpText()}
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
