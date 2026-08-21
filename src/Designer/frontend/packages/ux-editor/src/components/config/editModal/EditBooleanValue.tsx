import { StudioSwitch } from '@studio/components';
import type { IGenericEditComponent } from '../componentConfig';
import { useText, useComponentPropertyLabel, useComponentPropertyHelpText } from '../../../hooks';
import { FormField } from 'app-shared/components/FormField';
import type { PropertyDefinition } from '@app/layout-contract';

export interface EditBooleanValueProps extends IGenericEditComponent {
  propertyKey: string;
  defaultValue?: boolean;
  className?: string;
  definition?: PropertyDefinition;
}

export const EditBooleanValue = ({
  component,
  handleComponentChange,
  propertyKey,
  defaultValue,
  className,
  definition,
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

  return (
    <FormField
      id={component.id}
      value={component[propertyKey]}
      onChange={handleChange}
      customRequired={definition?.required}
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
            label={componentPropertyLabel(propertyKey, definition)}
          />
        );
      }}
    />
  );
};
