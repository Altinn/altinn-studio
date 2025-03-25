import { StudioNativeSelect, StudioTextfield } from '@studio/components-legacy';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { getComponentPropertyLabel } from '../../../utils/language';
import { FormField } from '../../FormField';
import type { IGenericEditComponent } from '../componentConfig';

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

  const handleValueChange = (newValue: string) => {
    handleComponentChange({
      ...component,
      [propertyKey]: newValue,
    });
  };

  return (
    <FormField
      id={component.id}
      label={getComponentPropertyLabel(propertyKey, t)}
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
          <StudioNativeSelect
            {...fieldProps}
            onChange={(e: any) => fieldProps.onChange(e)}
            multiple={multiple}
            id={`component-${propertyKey}-select${component.id}`}
          >
            {enumValues.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </StudioNativeSelect>
        ) : (
          <StudioTextfield
            {...fieldProps}
            id={`component-id-input${component.id}`}
            onChange={(e) => fieldProps.onChange(e.target.value, e)}
          />
        )
      }
    />
  );
};
