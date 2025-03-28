import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { FormField } from '../../FormField';
import { StudioNativeSelect } from '@studio/components-legacy';

enum HeaderSize {
  S = 'h4',
  M = 'h3',
  L = 'h2',
}

// Todo: This should be called "level" instead of "size"
export const EditHeaderSize = ({ handleComponentChange, component }: IGenericEditComponent) => {
  const t = useText();
  const sizes = [
    { value: HeaderSize.S, label: t('ux_editor.modal_header_type_h4') },
    { value: HeaderSize.M, label: t('ux_editor.modal_header_type_h3') },
    { value: HeaderSize.L, label: t('ux_editor.modal_header_type_h2') },
  ];
  const selectedHeaderSize =
    HeaderSize[component.size as keyof typeof HeaderSize] || component.size;

  const onSizeChange = (size) => {
    handleComponentChange({
      ...component,
      size: size,
    });
  };

  return (
    <div>
      <FormField
        id={component.id}
        label={t('ux_editor.modal_header_type_helper')}
        onChange={onSizeChange}
        value={
          (selectedHeaderSize ? sizes.find((size) => size.value === selectedHeaderSize) : sizes[0])
            ?.value
        }
        propertyPath={`${component.propertyPath}/properties/size`}
        renderField={({ fieldProps }) => (
          <StudioNativeSelect id={component.id} {...fieldProps}>
            {sizes.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </StudioNativeSelect>
        )}
      />
    </div>
  );
};
