import React from 'react';
import { Select } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { FormField } from '../../FormField';

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
        renderField={({ fieldProps }) => <Select {...fieldProps} options={sizes} />}
      />
    </div>
  );
};
