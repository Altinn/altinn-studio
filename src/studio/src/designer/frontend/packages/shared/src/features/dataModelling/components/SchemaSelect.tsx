import React from 'react';
import { Grid } from '@mui/material';
import Select from 'react-select';
import classNames from 'classnames';
import type { IMetadataOption } from '../functions/types';
import classes from './SchemaSelect.module.css';

export interface ISchemaSelectProps {
  disabled: boolean;
  selectedOption: IMetadataOption | null;
  onChange: (optionWithMetadata: { value: any; label: string }) => void;
  options: GroupedOption[];
}

export interface GroupedOption {
  readonly label: string;
  readonly options: readonly IMetadataOption[];
}

const formatGroupLabel = (data: GroupedOption) => (
  <div className={classes.group}>
    <span>{data.label}</span>
    <span className={classes.groupBadge}>{data.options.length}</span>
  </div>
);

export const SchemaSelect = (props: ISchemaSelectProps) => {
  const { onChange, disabled, selectedOption, options } = props;

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
      };
    },
  };
  const IndicatorSeparator = () => <></>;
  const DropdownIndicator = () => (
    <i
      className={classNames([classes['fa.fa-nedtrekk'], 'fa fa-nedtrekk', classes.chevron])}
      aria-hidden
    />
  );
  return (
    <Grid item xs={4}>
      <Select<IMetadataOption, false, GroupedOption>
        id='schema-select-schema'
        data-testid='schema-select-schema'
        styles={customStyles}
        components={{ IndicatorSeparator, DropdownIndicator }}
        onChange={onChange}
        className={classes.select}
        options={options}
        value={selectedOption}
        isDisabled={disabled}
        formatGroupLabel={formatGroupLabel}
      />
    </Grid>
  );
};
