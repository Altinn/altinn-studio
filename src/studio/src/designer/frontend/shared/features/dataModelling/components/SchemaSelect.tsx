import React, { CSSProperties } from 'react';
import { Grid } from '@mui/material';
import { makeStyles } from '@mui/styles';
import Select from 'react-select';
import classNames from 'classnames';
import type { IMetadataOption } from '../functions/types';

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

const groupStyles = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const groupBadgeStyles: CSSProperties = {
  backgroundColor: '#0062BA',
  borderRadius: '2em',
  color: 'white',
  display: 'inline-block',
  fontWeight: 'normal',
  lineHeight: '1',
  minWidth: 1,
  padding: '0.2em 0.5em',
  textAlign: 'center',
}

const formatGroupLabel = (data: GroupedOption) => (
  <div style={groupStyles}>
    <span>{data.label}</span>
    <span style={groupBadgeStyles}>{data.options.length}</span>
  </div>
);

const useStyles = makeStyles({
  root: {
    margin: 12,
    width: '100%',
    maxHeight: 36,
  },
  select: {
    minWidth: 400,
    zIndex: 1101,
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
export const SchemaSelect = (props: ISchemaSelectProps) => {
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
      };
    },
  };
  const IndicatorSeparator = () => <></>;
  const DropdownIndicator = () => <i className={classNames(['fa fa-nedtrekk', classes.chevron])} aria-hidden />;
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
