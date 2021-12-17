import Select from 'react-select';
import * as React from 'react';
import { Grid } from '@material-ui/core';
import {
  renderPropertyLabel,
  renderSelectTextFromResources,
  selectStyles,
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
    { value: HeaderSize.S, label: language.ux_editor.modal_header_type_h4 },
    { value: HeaderSize.M, label: language.ux_editor.modal_header_type_h3 },
    { value: HeaderSize.L, label: language.ux_editor.modal_header_type_h2 },
  ];
  const selectedHeaderSize =
    HeaderSize[component.size as keyof typeof HeaderSize] || component.size;

  const selectedValue = selectedHeaderSize
    ? sizes.find((size) => size.value === selectedHeaderSize)
    : sizes[0];

  return (
    <Grid container={true} spacing={0} direction='column'>
      {renderChangeId()}
      <div data-testid='header-resource-select-wrapper'>
        {renderSelectTextFromResources(
          'modal_properties_header_helper',
          handleTitleChange,
          textResources,
          language,
          component.textResourceBindings?.title,
          component.textResourceBindings?.title,
        )}
      </div>
      <Grid item={true} xs={12} data-testid='header-size-select-wrapper'>
        {renderPropertyLabel(language.ux_editor.modal_header_type_helper)}
        <Select
          styles={selectStyles}
          defaultValue={selectedValue}
          onChange={handleUpdateHeaderSize}
          options={sizes}
        />
      </Grid>
    </Grid>
  );
};
export default HeaderSizeSelect;
