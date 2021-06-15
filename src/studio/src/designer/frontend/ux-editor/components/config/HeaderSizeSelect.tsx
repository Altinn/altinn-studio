import Select from 'react-select';
import * as React from 'react';
import { Grid } from '@material-ui/core';
import { renderPropertyLabel, renderSelectTextFromResources } from '../../utils/render';

export interface HeaderSizeSelectProps {
  renderChangeId: () => JSX.Element,
  textResources: any,
  language: any,
  component: any,
  handleTitleChange: (e: any) => void,
  handleUpdateHeaderSize: (e: any) => void
}

const selectStyles = {
  control: (base: any) => ({
    ...base,
    borderRadius: '0 !important',
  }),
  option: (provided: any) => ({
    ...provided,
    whiteSpace: 'pre-wrap',
  }),
};

const HeaderSizeSelect: React.FunctionComponent<HeaderSizeSelectProps> = (props: HeaderSizeSelectProps) => {
  const {
    renderChangeId, handleTitleChange, handleUpdateHeaderSize,
  } = props;
  const sizes = [
    { value: 'S', label: props.language.ux_editor.modal_header_type_h4 },
    { value: 'M', label: props.language.ux_editor.modal_header_type_h3 },
    { value: 'L', label: props.language.ux_editor.modal_header_type_h2 },
  ];
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
          defaultValue={props.component.size ?
            sizes.find((size) => size.value === props.component.size) :
            sizes[0]}
          onChange={handleUpdateHeaderSize}
          options={sizes}
        />
      </Grid>
    </Grid>
  );
};
export default HeaderSizeSelect;
