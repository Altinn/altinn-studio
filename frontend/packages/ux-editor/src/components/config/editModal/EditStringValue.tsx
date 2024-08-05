import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { useTranslation } from 'react-i18next';
import { FormField } from '../../FormField';
import { Combobox, Textfield } from '@digdir/designsystemet-react';
import { useComponentPropertyLabel } from '../../../hooks/useComponentPropertyLabel';
import { useComponentPropertyEnumValue } from '@altinn/ux-editor/hooks/useComponentPropertyEnumValue';
import { StudioNativeSelect } from '@studio/components';

export interface EditStringValueProps extends IGenericEditComponent {
  propertyKey: string;
  helpText?: string;
  enumValues?: string[];
  multiple?: boolean;
}

export const EditStringValue = ({
  component,
  handleComponentChange,
  propertyKey,
  helpText,
  enumValues,
  multiple,
}: EditStringValueProps) => {
  const { t } = useTranslation();
  const componentPropertyLabel = useComponentPropertyLabel();
  const componentEnumValue = useComponentPropertyEnumValue();

  const handleValueChange = (newValue): void => {
    handleComponentChange({
      ...component,
      [propertyKey]: newValue,
    });
  };

  return (
    <FormField
      id={component.id}
      label={componentPropertyLabel(propertyKey)}
      value={component[propertyKey]}
      onChange={handleValueChange}
      propertyPath={`${component.propertyPath}/properties/${propertyKey}`}
      helpText={helpText}
      customValidationMessages={(errorCode: string) => {
        if (errorCode === 'pattern') {
          return t('validation_errors.pattern');
        }
      }}
      renderField={({ fieldProps }) =>
        enumValues ? (
          multiple ? (
            <Combobox
              label={fieldProps.label}
              value={fieldProps.value?.length > 0 ? fieldProps.value : []}
              onValueChange={(values) => fieldProps.onChange(values)}
              id={`component-${propertyKey}-select${component.id}`}
              multiple
              size='sm'
            >
              {enumValues.map((value) => (
                <Combobox.Option key={value} value={value}>
                  {componentEnumValue(value)}
                </Combobox.Option>
              ))}
            </Combobox>
          ) : (
            <StudioNativeSelect
              label={fieldProps.label}
              value={fieldProps.value}
              onChange={(e: any) => fieldProps.onChange(e.target.value)}
              id={`component-${propertyKey}-select${component.id}`}
              size='sm'
            >
              {enumValues.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </StudioNativeSelect>
          )
        ) : (
          <Textfield
            {...fieldProps}
            id={`component-id-input${component.id}`}
            onChange={(e) => fieldProps.onChange(e.target.value, e)}
          />
        )
      }
    />
  );
};
