import Select from 'react-select';
import React from 'react';
import { Grid } from '@mui/material';
import { PropertyLabel, selectStyles } from '../../utils/render';
import { IGenericEditComponent } from './componentConfig';
import { useSelector } from 'react-redux';
import { IAppState } from '../../types/global';

enum HeaderSize {
  S = 'h4',
  M = 'h3',
  L = 'h2',
}

export const EditHeaderSize = ({
  handleComponentChange,
  component,
}: IGenericEditComponent) => {
  const language = useSelector((state: IAppState) => state.appData.languageState.language);
  const sizes = [
    { value: HeaderSize.S, label: language.ux_editor.modal_header_type_h4 },
    { value: HeaderSize.M, label: language.ux_editor.modal_header_type_h3 },
    { value: HeaderSize.L, label: language.ux_editor.modal_header_type_h2 },
  ];
  const selectedHeaderSize =
    HeaderSize[component.size as keyof typeof HeaderSize] || component.size;

  const [selectedValue, setSelectedValue] = React.useState(selectedHeaderSize
    ? sizes.find((size) => size.value === selectedHeaderSize)
    : sizes[0]);

  const onSizeChange = (e: any) => {
    setSelectedValue(e.value);
    handleComponentChange({
      ...component,
      size: e.value,
    });
  }

  return (
    <Grid container={true} spacing={0} direction='column'>
      <Grid item={true} xs={12} data-testid='header-size-select-wrapper'>
        <PropertyLabel textKey='language.ux_editor.modal_header_type_helper' />
        <Select
          id={`edit-header-size-select-${component.id}`}
          styles={selectStyles}
          defaultValue={selectedValue}
          onChange={onSizeChange}
          options={sizes}
        />
      </Grid>
    </Grid>
  );
};
