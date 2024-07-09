import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { FormField } from '../../FormField';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { StudioNativeSelect } from '@studio/components';

enum HeaderSize {
  S = 'h4',
  M = 'h3',
  L = 'h2',
}

// Todo: This should be called "level" instead of "size"
export const EditHeaderSize = ({
  handleComponentChange,
  component,
}: IGenericEditComponent<ComponentType.Header>) => {
  const t = useText();
  const sizes = [
    { value: HeaderSize.S, label: t('ux_editor.modal_header_type_h4') },
    { value: HeaderSize.M, label: t('ux_editor.modal_header_type_h3') },
    { value: HeaderSize.L, label: t('ux_editor.modal_header_type_h2') },
  ];
  const selectedHeaderSize =
    HeaderSize[component.size as keyof typeof HeaderSize] || component.size;

  const onSizeChange = (size: string) => {
    handleComponentChange({
      ...component,
      size,
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
          <StudioNativeSelect
            {...fieldProps}
            label={fieldProps.label}
            id={component.id}
            value={fieldProps.value}
            onChange={(e) => fieldProps.onChange(e.target.value)}
            size='sm'
          >
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
