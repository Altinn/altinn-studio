import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { FormField } from '../../FormField';
import { getComponentPropertyLabel } from '../../../utils/language';
import { StudioSwitch } from '@studio/components';

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
          <StudioSwitch
            data-size='sm'
            {...fieldProps}
            checked={fieldProps.value ?? defaultValue}
            onChange={(e) => fieldProps.onChange(e.target.checked, e)}
            id={`${propertyKey}-checkbox-${component.id}`}
            disabled={isValueExpression(fieldProps.value)}
            label={getComponentPropertyLabel(propertyKey, t)}
          />
        );
      }}
    />
  );
};
