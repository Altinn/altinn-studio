import React from 'react';
import { Grid, makeStyles } from '@material-ui/core';
import Select from 'react-select';
import classNames from 'classnames';
import type { IMetadataOption } from '../functions/types';

interface ISchemaSelectProps {
  disabled: boolean;
  selectedOption: IMetadataOption | null;
  onChange: (optionWithMetadata: { value: any; label: string }) => void;
  options: IMetadataOption[];
}

const useStyles = makeStyles({
  root: {
    margin: 12,
    width: '100%',
    maxHeight: 36,
  },
  select: {
    minWidth: 147,
    zIndex: 1101
  },
  chevron: {
    margin: 12,
    color: '#006BD8',
    '&.fa.fa-nedtrekk': {
      fontSize: 16,
      fontWeight: 600,
    },
  },
});
const SchemaSelect = (props: ISchemaSelectProps) => {
  const { onChange, disabled, selectedOption, options } = props;

  const classes = useStyles();
  const customStyles = {
    control: (base: any, state: any) => {
      const opacity = state.isDisabled ? 0.5 : 1;
      return {
      ...base,
      opacity,
      height: 36,
      minHeight: 36,
      borderRadius: 0,
      border: '2px solid #008FD6',
    }},
  };
  const IndicatorSeparator = () => <></>;
  const DropdownIndicator = () => (
    <i
      className={classNames(['fa fa-nedtrekk', classes.chevron])}
      aria-hidden
    />
  );
  return (
    <Grid item xs={4}>
      <Select
        id='schema-select-schema'
        styles={customStyles}
        components={{ IndicatorSeparator, DropdownIndicator }}
        onChange={onChange}
        className={classes.select}
        options={options}
        value={selectedOption}
        isDisabled={disabled}
      />
    </Grid>
  );
};
export default SchemaSelect;
