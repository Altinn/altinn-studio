import { Switch } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText, useComponentPropertyLabel, useComponentPropertyHelpText } from '../../../hooks';
import { FormField } from '../../FormField';

export interface EditBooleanValueProps extends IGenericEditComponent {
  propertyKey: string;
  defaultValue?: boolean;
  className?: string;
}

export const EditBooleanValue = ({
  component,
  handleComponentChange,
  propertyKey,
  defaultValue,
  className,
}: EditBooleanValueProps) => {
  const t = useText();
  const componentPropertyLabel = useComponentPropertyLabel();
  const componentPropertyHelpText = useComponentPropertyHelpText();

  const handleChange = (newValue: boolean) => {
    handleComponentChange({
      ...component,
      [propertyKey]: newValue,
    });
  };

  const isValueExpression = (value: any) => {
    return Array.isArray(value);
  };

  const helpText = isValueExpression(component[propertyKey])
    ? t('ux_editor.component_properties.config_is_expression_message')
    : componentPropertyHelpText(propertyKey);

  const schemaPropertyPath = component.propertyPath
    ? `${component.propertyPath}/properties/${propertyKey}`
    : undefined;

  return (
    <FormField
      id={component.id}
      value={component[propertyKey]}
      onChange={handleChange}
      propertyPath={schemaPropertyPath}
      componentType={component.type}
      helpText={helpText}
      className={className}
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
