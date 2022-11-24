import React from 'react';
import Select from 'react-select';
import {
  PropertyLabel,
  selectStyles,
  SelectTextFromRecources
} from '../../utils/render';

export interface HeaderSizeSelectProps {
  renderChangeId: () => JSX.Element;
  textResources: any;
  language: any;
  component: any;
  handleTitleChange: (e: any) => void;
  handleUpdateHeaderSize: (e: any) => void;
}

enum HeaderSize {
  S = 'h4',
  M = 'h3',
  L = 'h2',
}

export const HeaderSizeSelect = ({
  renderChangeId,
  handleTitleChange,
  handleUpdateHeaderSize,
  language,
  textResources,
  component,
}: HeaderSizeSelectProps) => {
  const sizes = [
    { value: HeaderSize.S, label: language['ux_editor.modal_header_type_h4'] },
    { value: HeaderSize.M, label: language['ux_editor.modal_header_type_h3'] },
    { value: HeaderSize.L, label: language['ux_editor.modal_header_type_h2'] },
  ];
  const selectedHeaderSize = HeaderSize[component.size as keyof typeof HeaderSize] || component.size;

  const selectedValue = selectedHeaderSize ? sizes.find((size) => size.value === selectedHeaderSize) : sizes[0];

  const id = `HeaderSizeSelect-input-${component.id}`;

  return (
    <>
      {renderChangeId()}
      <div data-testid='header-resource-select-wrapper'>
        <SelectTextFromRecources
          labelText={'modal_properties_header_helper'}
          onChangeFunction={handleTitleChange}
          textResources={textResources}
          language={language}
          placeholder={component.textResourceBindings?.title}
          description={component.textResourceBindings?.title}
        />
      </div>
      <div data-testid='header-size-select-wrapper'>
        <PropertyLabel
          textKey={language['ux_editor.modal_header_type_helper']}
          htmlFor={id}
        />
        <Select
          styles={selectStyles}
          defaultValue={selectedValue}
          onChange={handleUpdateHeaderSize}
          options={sizes}
          inputId={id}
        />
      </div>
    </>
  );
};
export default HeaderSizeSelect;
