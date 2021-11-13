import Select from 'react-select';
import * as React from 'react';
import { Grid } from '@material-ui/core';
import { renderPropertyLabel, renderSelectTextFromResources, selectStyles } from '../../utils/render';

export interface HeaderSizeSelectProps {
  renderChangeId: () => JSX.Element,
  textResources: any,
  language: any,
  component: any,
  handleTitleChange: (e: any) => void,
  handleUpdateHeaderSize: (e: any) => void
}

const sizeCompat:any = {
  S: 'h4',
  M: 'h3',
  L: 'h2',
};

const HeaderSizeSelect: React.FunctionComponent<HeaderSizeSelectProps> = (props: HeaderSizeSelectProps) => {
  const {
    renderChangeId, handleTitleChange, handleUpdateHeaderSize,
  } = props;
  const sizes = [
    { value: 'h4', label: props.language.ux_editor.modal_header_type_h4 },
    { value: 'h3', label: props.language.ux_editor.modal_header_type_h3 },
    { value: 'h2', label: props.language.ux_editor.modal_header_type_h2 },
  ];
  const value = sizeCompat[props.component.size] || props.component.size;
  return (
    <Grid
      container={true}
      spacing={0}
      direction='column'
    >
      {renderChangeId()}
      {renderSelectTextFromResources('modal_properties_header_helper',
        handleTitleChange,
        props.textResources,
        props.language,
        props.component.textResourceBindings?.title,
        props.component.textResourceBindings?.title)}
      <Grid item={true} xs={12}>
        {renderPropertyLabel(props.language.ux_editor.modal_header_type_helper)}
        <Select
          styles={selectStyles}
          defaultValue={value ?
            sizes.find((size) => size.value === value) :
            sizes[0]}
          onChange={handleUpdateHeaderSize}
          options={sizes}
        />
      </Grid>
    </Grid>
  );
};
export default HeaderSizeSelect;
