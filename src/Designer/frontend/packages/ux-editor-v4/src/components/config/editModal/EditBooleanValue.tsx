import type { IGenericEditComponent } from '../componentConfig';
import { useText, useComponentPropertyLabel, useComponentPropertyHelpText } from '../../../hooks';
import { FormField } from '../../FormField';
import { StudioSwitch } from '@studio/components';

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
          <StudioSwitch
            data-size='sm'
            {...fieldProps}
            checked={fieldProps.value ?? defaultValue}
            onChange={(e) => fieldProps.onChange(e.target.checked, e)}
            id={`${propertyKey}-checkbox-${component.id}`}
            disabled={isValueExpression(fieldProps.value)}
            label={componentPropertyLabel(propertyKey)}
          />
        );
      }}
    />
  );
};
