import Select from 'react-select';
import React from 'react';
import { selectStyles } from '../../../utils/render';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { Label } from 'app-shared/components/Label';

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
  const selectedHeaderSize = HeaderSize[component.size as keyof typeof HeaderSize] || component.size;

  const onSizeChange = (e: any) => {
    handleComponentChange({
      ...component,
      size: e.value,
    });
  };

  return (
    <div data-testid='header-size-select-wrapper'>
      <Label htmlFor={`edit-header-size-select-${component.id}`}>
        {t('ux_editor.modal_header_type_helper')}
      </Label>
      <Select
        inputId={`edit-header-size-select-${component.id}`}
        styles={selectStyles}
        value={selectedHeaderSize ? sizes.find((size) => size.value === selectedHeaderSize) : sizes[0]}
        onChange={onSizeChange}
        options={sizes}
      />
    </div>
  );
};
